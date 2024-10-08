class Usage:
    core_per_s = 0.000052
    gb_ram_per_s = 0.00000767

    @classmethod
    def cpu_per_s(cls, cores: float, seconds: float) -> float:
        return (cores * cls.core_per_s) * seconds

    @classmethod
    def ram_per_s(cls, ram: float, seconds: float) -> float:
        return (ram * cls.gb_ram_per_s) * seconds


if __name__ == "__main__":
    cores = 0.5
    ram = (2024, 3048)

    timeout = 500
    usage = 0
    idle = 3600

    base = Usage.cpu_per_s(cores, idle)
    print("Idle CPU:", base)

    actual = Usage.cpu_per_s(cores + 4, usage)
    print("Active CPU:", actual)

    total_cpu = actual + base
    print("total CPU:", total_cpu)

    base_ram = Usage.ram_per_s(ram[0] / 1000, idle)
    print("Idle RAM:", base_ram)

    actual_ram = Usage.ram_per_s(((ram[1] / 1000) / 2) + ram[0] / 1000, usage)
    print("Active RAM:", actual_ram)

    total_ram = actual_ram + base_ram
    print("total RAM:", total_ram)

    print("total:", total_cpu + total_ram)