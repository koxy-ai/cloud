import sys

if __name__ == "__main__":
    args = sys.argv
    api = args[1]

    with open("./src/api.json", "w") as f:
        f.write(api)