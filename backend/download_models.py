import os, sys, pathlib, requests

ROOT = pathlib.Path(__file__).resolve().parent
MODELS = ROOT / "models"
MODELS.mkdir(parents=True, exist_ok=True)

# Known public URLs for Zhang et al. colorization model files.
URLS = {
    "colorization_deploy_v2.prototxt": "https://raw.githubusercontent.com/richzhang/colorization/caffe/models/colorization_deploy_v2.prototxt",
    "colorization_release_v2.caffemodel": "http://eecs.berkeley.edu/~rich.zhang/projects/2016_colorization/files/demo_v2/colorization_release_v2.caffemodel",
    "pts_in_hull.npy": "https://raw.githubusercontent.com/richzhang/colorization/caffe/resources/pts_in_hull.npy"
}

def need_download(fname: str) -> bool:
    p = MODELS / fname
    return not p.exists() or p.stat().st_size < 1000

def fetch(url: str, out: pathlib.Path):
    print(f"Downloading {url} -> {out}")
    with requests.get(url, stream=True, timeout=120) as r:
        r.raise_for_status()
        with open(out, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)

def main():
    ok = True
    for fname, url in URLS.items():
        out = MODELS / fname
        if need_download(fname):
            try:
                fetch(url, out)
            except Exception as e:
                ok = False
                print(f"[WARN] Failed to download {fname}: {e}")
        else:
            print(f"Found {fname}, skip.")
    if not ok:
        print("""\nSome model files failed to download.
Please manually place these files under ./backend/models :
  - colorization_deploy_v2.prototxt
  - colorization_release_v2.caffemodel
  - pts_in_hull.npy

You can find them in the official 'richzhang/colorization' repository.
""")
    else:
        print("All model files ready.")

if __name__ == "__main__":
    main()
