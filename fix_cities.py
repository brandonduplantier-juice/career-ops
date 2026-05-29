with open('linkedin_scan.py', 'r', encoding='utf-8') as f:
    content = f.read()

extra_cities = '''    "toronto, oh", "grand rapids, mi", "salt lake city, ut", "tucson, az",
    "troy, mi", "livonia, mi", "marietta, oh", "maryland heights, mo",
    "american fork, ut", "honolulu, hi", "louisville, ky",
    "alberta, united", "florida, united", "colorado, united",
    "california, united", "alabama, united", "ohio, united",
    "michigan, united", "georgia, united", "texas, united",
    "new jersey, united", "virginia, united", "tennessee, united",
'''

content = content.replace(
    '    "salina, ks", "peoria, az", "cincinnati", "new york, united states",\n]',
    '    "salina, ks", "peoria, az", "cincinnati", "new york, united states",\n' + extra_cities + ']'
)

with open('linkedin_scan.py', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
print('City count:', content.count('",') )