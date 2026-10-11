"""Print hash-verified, existing PC artifact bytes in bounded per-topic logs."""
import base64
import hashlib
import json
import os
from pathlib import Path
import sys

root = Path(sys.argv[1])
topic = sys.argv[2]
topics = {"climate-basins": ["climate", "basins"], "rivers": ["rivers"],
          "rainfall": ["rainfall"], "terrain": ["terrain"],
          "elevation": ["elevation"], "agriculture": ["agriculture"]}
if topic not in topics:
    raise ValueError("Unknown review topic")

for stage in ["nature-before", "nature-after"]:
    folder = root / stage
    report = json.loads((folder / "report.json").read_text())
    expected = "baseline-recorded" if stage.endswith("before") else "passed"
    assert report["result"] == expected
    if stage.endswith("after"):
        assert report["commit"] == os.environ["LATIN_READING_EXPECTED_HEAD"]
    selected = [shot for shot in report["shots"]
                if any(shot["file"].startswith(prefix + "-" + name + "-")
                       for name in topics[topic]
                       for prefix in ["before", "after"])]
    assert selected, (stage, topic)
    print("LATIN_NATURE_TOPIC_REPORT " + json.dumps({
        "topic": topic, "stage": stage, "commit": report["commit"],
        "browser": report["browser"], "checks": report["checks"],
        "errors": report["errors"], "failedRequests": report["failedRequests"],
        "result": report["result"], "shots": selected}, ensure_ascii=False))
    for shot in selected:
        png = folder / shot["file"]
        preview = shot["preview"]
        file = folder / preview["file"]
        assert png.parent == folder and file.parent == folder
        assert hashlib.sha256(png.read_bytes()).hexdigest() == shot["sha256"]
        data = file.read_bytes()
        assert hashlib.sha256(data).hexdigest() == preview["sha256"]
        assert len(data) == preview["bytes"]
        encoded = base64.b64encode(data).decode("ascii")
        for index in range(0, len(encoded), 48000):
            print("LATIN_NATURE_PREVIEW " + json.dumps({
                "file": stage + "/" + preview["file"], "part": index // 48000,
                "total": (len(encoded) + 47999) // 48000,
                "base64": encoded[index:index + 48000]}))
