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
                            # Find unique activity types
                            types = set()
                            for item in activity:
                                types.add(item.get('activity_type'))
                            print(f"Activity Types: {types}")
                            
                            # Look for highlights or notes
                            for item in activity:
                                if 'highlight' in str(item).lower() or 'quote' in str(item).lower():
                                    print("Found potentially relevant activity:")
                                    print(json.dumps(item, indent=2))
                                    break
                    else:
                        print("activity.json not found")
except Exception as e:
    print(f"Error: {e}")
