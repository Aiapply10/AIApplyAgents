from fastapi import FastAPI

app = FastAPI()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/apply")
def apply():
    return {"message": "Applier placeholder"}
