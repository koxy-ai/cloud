import modal

def main():
    print("Hi from main def")
    print({"test": "test value"})
    return f"main response {modal.Dict}"

if __name__ == "__main__":
    print("Running")
    print(f"<KOXY_RES> {main()}")