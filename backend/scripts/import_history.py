import argparse
import json
import sys

from pydantic import ValidationError

from app.db.session import SessionLocal
from app.services.importer import import_history


def main():
    parser = argparse.ArgumentParser(description="Import historical Call Bridge matches")
    parser.add_argument("file", help="Path to the JSON file")
    parser.add_argument("--dry-run", action="store_true", help="Check and print, but save nothing")
    args = parser.parse_args()

    with open(args.file, encoding="utf-8") as f:
        payload = json.load(f)

    db = SessionLocal()
    try:
        report = import_history(db, payload, dry_run=args.dry_run)
    except ValidationError as error:
        print("DATA ERROR - nothing was saved:\n")
        print(error)
        sys.exit(1)
    finally:
        db.close()

    for item in report["imported"]:
        print(f"\n{item['key']}  ({item['date']})")
        for name, total, position in item["results"]:
            print(f"   {position}.  {name:<15} {total:>8.3f}")

    mode = "DRY RUN (nothing saved)" if args.dry_run else "SAVED"
    print(f"\n{mode}: {len(report['imported'])} imported, {len(report['skipped'])} skipped (already imported)")


if __name__ == "__main__":
    main()
