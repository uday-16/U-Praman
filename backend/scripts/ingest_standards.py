"""Build/validate the shared page-aware RAG index without deleting the old Chroma database."""
import argparse
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.services.corpus import get_corpus

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--download-model', action='store_true', help='Download the configured local sentence-transformer model.')
    args = parser.parse_args()
    print(json.dumps(get_corpus(download=args.download_model, force=True).report(), indent=2))
