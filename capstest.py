import requests

requests.post(
    "http://localhost:5000/set_colab_url",
    json={
        "url": "https://alejandrina-unpendulous-snuffily.ngrok-free.dev"
    }
)

print("DONE")