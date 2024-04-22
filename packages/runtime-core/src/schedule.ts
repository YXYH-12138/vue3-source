// 任务队列
const jobQueue = new Set<Function>();
const p = Promise.resolve();

// 队列是否在刷新
let isFinish = false;

function flushJob() {
	if (isFinish) return;
	// 标志队列正在刷新
	isFinish = true;
	p.then(() => {
		jobQueue.forEach((fn) => fn());
	}).finally(() => {
		// 重置状态
		isFinish = false;
	});
}

export default function schedule(effect: any) {
	jobQueue.add(effect);
	flushJob();
}
