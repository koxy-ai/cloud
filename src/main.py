import modal

sb = modal.Sandbox.create(
    *["sleep", "infinity"], image=modal.Image.debian_slim(), timeout=20
)
# sb = modal.Sandbox.from_id("sb-HTuc0F7q9PUuEcz4TqN8ik")

# for line in sb.stdout:
#     print(line)

# sb.wait()

# sb = modal.Sandbox.from_id("sb-yXV4ohe1VjxlanJhuaxgZ2")

print(sb.object_id)

print("starting process")
process = sb.exec("bash", "-c", "for i in $(seq 1 10); do echo foo $i; sleep 0.5; done")

for line in process.stdout:
    print(line)

process.wait()
print(process.returncode)

sb.terminate()