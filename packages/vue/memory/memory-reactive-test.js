// @ts-check

import { reactive, effect } from "@mini-vue/reactivity";

// 创建 10000 个 effect 占用的总内存: 4.1000 MB
// 平均每个 effect 占用大约: 429.92 Bytes

// 辅助函数：将字节转换为 KB / MB，方便阅读
function formatMemory(bytes) {
	return (bytes / 1024 / 1024).toFixed(4) + " MB";
}

function runMemoryTest() {
	// 1. 准备基础数据
	const counter = reactive({ num1: 1 });
	const effects = []; // 用数组存起来，防止被意外回收
	const COUNT = 10000;

	// 2. 强制进行一次垃圾回收，清理环境
	if (global.gc) {
		global.gc();
	} else {
		console.warn("请在运行 node 时加上 --expose-gc 参数");
		return;
	}

	// 3. 记录初始内存（基准线）
	const initialMemory = process.memoryUsage().heapUsed;

	// 4. 创建 effect
	for (let i = 0; i < COUNT; i++) {
		const runner = effect(() => {
			counter.num1 + counter.num1 + counter.num1;
		});
		effects.push(runner);
	}

	// 5. 再次强制垃圾回收，清理掉创建过程中产生的临时无用变量
	global.gc();

	// 6. 记录创建后的内存
	const finalMemory = process.memoryUsage().heapUsed;

	// 7. 计算差值
	const memoryUsed = finalMemory - initialMemory;

	console.log(`创建 ${COUNT} 个 effect 占用的总内存: ${formatMemory(memoryUsed)}`);
	console.log(`平均每个 effect 占用大约: ${(memoryUsed / COUNT).toFixed(2)} Bytes`);

	// 保持引用，防止过早被回收
	console.log(`(验证数量: ${effects.length})`);
}

runMemoryTest();
