class Usage:
    core_per_s = 0.000045
    gb_ram_per_s = 0.00000887

    @classmethod
    def cpu_per_s(cls, cores: float, seconds: float) -> float:
        return (cores * cls.core_per_s) * seconds

    @classmethod
    def ram_per_s(cls, ram: float, seconds: float) -> float:
        return (ram * cls.gb_ram_per_s) * seconds

if __name__ == "__main__":
    timeout = 500
    usage = 935092 / 1000
    idle = 100000 / 1000

    base = Usage.cpu_per_s(1, idle)
    print(base)

    if base < 0:
        base = 0

    actual = Usage.cpu_per_s(5, usage)
    print(actual)

    print(actual + base)
