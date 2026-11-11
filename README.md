# Text Rewrite

A small Python web server that rewrites messages and generates subject lines using an OpenAI-compatible Responses API. It provides a responsive interface that follows the device's light or dark colour preference. Users can write Markdown, preview it, and copy the Markdown source of each result.

## Setup

Requires Python 3.10 or newer. Create a virtual environment and install the dependencies:

```sh
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

Copy `config.example.json` to `config.json`, replace the example username and password, and review the upstream and model settings. Restrict access to the config file because it contains plain-text passwords and the API key:

```sh
cp config.example.json config.json
chmod 600 config.json
python app.py
```

Open `http://127.0.0.1:8080/`. To use a different config path, run `python app.py --config /path/to/config.json`. The server reads the config at startup, so restart it after making changes.

## Configuration

- `upstream.url`: The full Responses API URL, including `/v1/responses`.
- `upstream.api_key`: The bearer token sent only to the configured upstream.
- `models`: A non-empty list of objects with a model `key` and an optional display `name`.
- `default_model`: The key of the model selected when the page opens.
- `users`: A non-empty list of objects with `username` and `password`. Both are stored as plain text in the config.
- `shared_prompt`: An optional string appended to the base system prompt for every request.
- `prompts`: An optional list of custom style objects. Each has a unique `key`, a display `name`, and a `prompt` string. Custom styles appear alongside the built-in styles.
- `secure_cookie`: Controls the session cookie's `Secure` attribute. It defaults to `true` if omitted. See [Access and sessions](#access-and-sessions) for details.
- `host` and `port`: The listening address and port. They default to `127.0.0.1` and `8080`.

For example, add a custom style to the `prompts` list:

```json
{"key": "empathetic", "name": "Empathetic", "prompt": "Use a considerate and reassuring tone."}
```

The prompt consists of the built-in instructions, followed by `shared_prompt`, followed by the selected style. The default style is no extra style. The source message is sent separately from these instructions.

The example upstream uses `http://127.0.0.1:8000/v1/responses`, `sk-my-api`, and `gpt-6-luna`. Requests use a strict JSON Schema for both result fields, streaming, `store: false`, and UUIDv7 `session-id` and `thread-id` headers. The configured upstream must support the Responses API, streaming, and structured outputs for the chosen models. The UUID headers are required by the supplied local debugging endpoint.

## Access and sessions

The application uses an opaque, random session cookie and verifies the corresponding in-memory session on each protected request. A session expires after seven days without an authenticated request, on logout, or when the server restarts. Failed login responses are delayed by one second. This delay does not prevent parallel attempts.

When `secure_cookie` is `true`, the server marks the session cookie `Secure`, telling the browser to send it only over HTTPS. Browsers may treat localhost as an exception. With `false`, the cookie can also be sent over HTTP, where it can be intercepted by someone with access to the network. Use `false` only for local HTTP development, as in the example config. When accessing the app remotely over plain HTTP, a `Secure` cookie generally cannot be used and login will not persist.

This setting does not enable HTTPS, encrypt the cookie, or change the connection to the upstream API. Configure HTTPS separately at the reverse proxy. The cookie remains `HttpOnly` and `SameSite=Strict` with either setting. Restart the server after changing the config.

Run one server process because sessions are held in its memory. For access from other devices on a private network, place the server behind a trusted HTTPS reverse proxy and set `secure_cookie` to `true`. Keep the server bound to localhost when the proxy runs on the same machine. The browser clipboard API also requires HTTPS or localhost.

The page renders Markdown with bundled markdown-it. Raw HTML is disabled and unsafe link schemes are rejected. Markdown images can cause the browser to contact the image host when a preview is displayed.
