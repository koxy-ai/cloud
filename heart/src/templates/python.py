import os
import json

# <CODE>

if __name__ == "__main__":
    args = os.sys.argv[1:]
    inputs = {}

    for arg in args:
        equal_index = arg.find("=")
        if equal_index == -1:
            continue
            
        key = arg[:equal_index]
        value = arg[equal_index + 1:]

        try:
            value = json.loads(value)
        except:
            pass

        inputs[key] = value

    print("Running")
    print(f"<KOXY_RES> {main(inputs)}")