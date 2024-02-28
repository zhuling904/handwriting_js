/**
 * 以数组尾部作为栈顶
 */
class BaseStack {
  stackData = [];

  initStackByArr(arr) {
    this.stackData = arr;
  }

  push(elem) {
    this.stackData.push(elem);
  }

  pop() {
    const elem = this.stackData.pop();
    return elem;
  }

  peek() {
    return this.stackData[this.stackData.length - 1];
  }

  isEmpty() {
    return this.stackData.length === 0;
  }

  size() {
    return this.stackData.length;
  }

  printf() {
    console.log(this.stackData);
  }
}

const stack = new BaseStack();
// 情况下代码模拟
stack.push(6);
stack.push(5);
stack.printf();
stack.pop(); // 5
stack.printf();
stack.push(4);
stack.printf();
stack.pop(); // 4
stack.push(3);
stack.printf();
stack.pop(); // 3
stack.pop(); // 6
stack.push(2);
stack.push(1);
stack.printf();
stack.pop(); // 1
stack.pop(); // 2

stack.printf();
