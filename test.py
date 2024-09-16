import hashlib

st = 'Hello this is me'

result = hashlib.sha256(st.encode())
print(result.hexdigest())