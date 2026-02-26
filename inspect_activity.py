import zipfile
import json
import io

try:
    with zipfile.ZipFile('Goodreads.zip', 'r') as z:
        if 'activity.zip' in z.namelist():
            with z.open('activity.zip') as nested_zip_bytes:
                with zipfile.ZipFile(io.BytesIO(nested_zip_bytes.read())) as nested_z:
                    if 'activity.json' in nested_z.namelist():
                        with nested_z.open('activity.json') as f:
                            activity = json.load(f)
                            # Print first 5 items to check structure
                            print(json.dumps(activity[:5], indent=2))
                    else:
                        print("activity.json not found")
        else:
            print("activity.zip not found")
except Exception as e:
    print(f"Error: {e}")
