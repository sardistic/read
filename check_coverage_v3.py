import json

try:
    with open('src/data/library.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    works = data.get('works', [])
    total = len(works)
    
    quote_counts = {}
    for work in works:
        q_len = len(work.get('quotes', []))
        quote_counts[q_len] = quote_counts.get(q_len, 0) + 1
        
    print(f"Total Works: {total}")
    print("Quote Count Distribution:")
    for count in sorted(quote_counts.keys()):
        print(f"  - {count} quotes: {quote_counts[count]} books")

    # List books with < 5 quotes
    print("\n--- Books with < 5 quotes ---")
    thin_books = [w for w in works if len(w.get('quotes', [])) < 5]
    for w in sorted(thin_books, key=lambda x: len(x.get('quotes', []))):
        print(f"  - {w['title']} ({len(w.get('quotes', []))} quotes) [ID: {w['id']}]")

except Exception as e:
    print(f"Error: {e}")
