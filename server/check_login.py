import json
import urllib.request
import urllib.error

url = 'http://localhost:5000/api/auth/login'
data = json.dumps({
    'email': 'fleet.manager@transitops.demo',
    'password': 'password123',
}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req, timeout=10) as res:
        print('STATUS', res.getcode())
        print(res.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print('STATUS', e.code)
    print(e.read().decode('utf-8'))
except Exception as e:
    print('ERROR', e)
