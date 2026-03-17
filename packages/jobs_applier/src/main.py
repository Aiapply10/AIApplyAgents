"""Service entrypoint that launches the bot FastAPI application."""

import uvicorn

from api.app import create_app

app = create_app()


def main() -> None:
    """Start the FastAPI server for bot management."""
    uvicorn.run("main:app", app_dir="src", host="0.0.0.0", port=8002)


if __name__ == "__main__":
    main()
