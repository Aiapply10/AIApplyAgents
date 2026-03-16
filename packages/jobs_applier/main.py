"""Package-root launcher so `python main.py` works directly."""

import sys
import os
import subprocess
from pathlib import Path


def _bootstrap_src_path() -> None:
    src_path = Path(__file__).resolve().parent / "src"
    if str(src_path) not in sys.path:
        sys.path.insert(0, str(src_path))


def main() -> None:
    _bootstrap_src_path()
    try:
        from main import main as src_main
    except ModuleNotFoundError as exc:
        if exc.name != "uvicorn":
            raise
        if os.getenv("JOBS_APPLIER_UV_BOOTSTRAPPED") == "1":
            raise
        env = os.environ.copy()
        env["JOBS_APPLIER_UV_BOOTSTRAPPED"] = "1"
        subprocess.run(["uv", "run", "python", "main.py"], check=True, env=env)
        return
    src_main()


if __name__ == "__main__":
    main()

