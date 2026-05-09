import { createServer } from "node:http";
import handler from "./server";

const PORT = Number(process.env.PORT ?? 3000);

const server = createServer(async (req, res) => {
  try {
    // Build full URL
    const protocol = req.headers["x-forwarded-proto"] ?? "http";
    const host = req.headers.host ?? "localhost";
    const url = new URL(req.url ?? "/", `${protocol}://${host}`);

    // Build Headers
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const v of value) headers.append(key, v);
      } else {
        headers.set(key, value);
      }
    }

    // Collect body
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);

    // Create Request
    const request = new Request(url, {
      method: req.method,
      headers,
      body: body.length > 0 ? body : undefined,
    });

    // Call handler
    const response = await handler.fetch(request, {}, {});

    // Send response
    res.statusCode = response.status;
    res.statusMessage = response.statusText;
    for (const [key, value] of response.headers.entries()) {
      res.setHeader(key, value);
    }
    const responseBody = await response.arrayBuffer();
    res.end(Buffer.from(responseBody));
  } catch (err) {
    console.error("Server error:", err);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
