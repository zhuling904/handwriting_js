# 14 async&await实现原理

本质是希望实现一个co函数

https://juejin.cn/post/6844904096525189128?searchId=202310102300416EBE8AE5D31B3011EF95#heading-13

# 一、async和await的基本用法

## 1.async函数

async函数**在没有使用await时**，和普通函数没有什么太大的区别，最主要的区别就是**async函数始终返回一个Promise对象**。

### async函数返回promise对象的状态

- **不返回任何东西，相当于返回undefined**

```js
async funcion foo() {
    
}
console.log(foo())  // 打印的promise对象state是fulfilled，result为undefined。
```

![image-20230927120516780](https://cdn.jsdelivr.net/gh/zhuling904/DrawingBed/img/image-20230927120516780.png)

- **返回普通数据类似时**

```js
async function foo() {
    return 1 // foo函数返回值的promise对象state是fulfilled，result为1。
    return '1' // foo函数返回值的promise对象state是fulfilled，result为'1'。
    return []  // foo函数返回值的promise对象state是fulfilled，result为[]。
    return {}  // foo函数返回值的promise对象state是fulfilled，result为{}。
    return Symbol() // foo函数返回值的promise对象state是fulfilled，result为Symbol()。
}
```

+ **返回含有then方法的对象时**, **then方法会被调用**，同时then方法会有两个参数**resolve和reject**，**调用了resolve**，则返回的对象的**状态为fulfilled**，**调用了reject**，则返回的对象的状态为**rejected**，如果在then方法里面**没有调用resolve或者reject**则返回的Promise对象的**状态为pending**

```js
async function foo() {
    return {
        then(resolve, reject) {// then方法会被调用
            console.log(1) 
            resolve('then') // foo函数返回值的promise对象state是fulfilled，result为'then'。
        }
    }
}
```

- **返回一个Promise对象**,**函数返回值的Promise的状态和return的Promise完全一致**。

```js
async function foo() {
    return new Promise((resolve, reject) => {
        
    })
}
```

+ async函数中**抛出错误**。

```js
async function foo() {
    throw new Error('error')
    // foo函数返回值的promise对象state是reject，result为错误信息。
}
```

总结一下，**大多数情况下，async函数返回的Promise的状态为fulfilled**，只有在返回值是一个**Promise对象并且该对象的状态为rejected，或者是含有then方法的对象，并且在then方法中调用了reject函数，或者是函数执行过程中抛出错误**，才会**使得async函数返回的Promise的状态为rejected**。

## 2.await

**正常情况下，await命令后面是一个Promise对象**，如果不是，会被转成**一个立即resolve的Promise对象**。 **await命令只能**在**async函数内部使用**，否则会报错。使用await时，**必须保证上一层的函数时async函数，否则会报错**。

```js
function foo() {
    await 1 // Uncaught SyntaxError: await is only valid in async functions and the top level bodies of modules
}
async function foo() {
    await 1 // 这样不会报错
    function bar() {
        await 2 // 这样会报错
    }
}
```

### 在async函数中使用await

- 在async函数中，如果使用了**await命令**，那么只要**await命令跟着的promise对象状态没有变成fulfilled**，那么await后面的代码都不会执行。

```js
async function foo() {
    await new Promise((resolve, reject) => {
        
    })
    // 只要上面没有调用resolve将promise状态变成fulfilled，那么这里的代码会被一直阻塞，不会被执行。
    // 这里的代码相当于上一个Promise的then方法，是一个微任务。
    console.log('后面的代码')
}
```

- **当await函数跟着的promise对象为rejected时，会抛出一个错误，并且终止程序。**

```js
async function foo() {
    await new Promise((resolve, reject) => {
        reject('reject')
    })
    // 这里的代码不会被执行
    console.log(1)
}
foo()
```

- 为了防止上面的情况发生，可以将await放在try...catch语句中

```js
async function foo() {
    try {
        await new Promise((resolve, reject) => {
            reject('reject')
        })
    } catch(err) {
        console.log(err)
    }
    // 这里的代码会被执行。
    console.log(111)
}
```



# 二、手写实现

## 1.生成器简单实现

让生成器函数自执行

- `async/await`自带执行器，不需要手动调用next()就能自动执行下一步
- `async`函数返回值是Promise对象，而Generator返回的是生成器对象
- `await`能够返回Promise的resolve/reject的值

```js
// 实现生成器实现
function* asyncGetResult() {
  yield new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(1);
      console.log("value1");
    }, 1000);
  });

  yield new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(2);
      console.log("value2");
    }, 500);
  });

  yield new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(3);
      console.log("value3");
    }, 100);
  });
}

const gen = asyncGetResult();
console.log(gen);
// =============log: 3, 2, 1===============
// const value1 = gen.next();
// console.log("✅ ~ value1:", value1);
// const value2 = gen.next();
// console.log("✅ ~ value2:", value2);
// const value3 = gen.next();
// console.log("✅ ~ value3:", value3);

// =============生成器模拟运行：需要手动执行,每次执行得嵌套===============
// gen.next().value.then((res) => {
//   console.log("✅ ~ res1:", res);
//   gen.next().value.then((res) => {
//     console.log("✅ ~ res2:", res);
//     gen.next().value.then((res) => {
//       console.log("✅ ~ res3:", res);
//     });
//   });
// });

// =================通过递归实现自动执行===========
function co(gen) {
  const valueObj = gen.next();
  if (valueObj.done) {
    return;
  }
  valueObj.value.then((res) => {
    console.log("✅ ~ res1:", res);
    co(gen);
  });
}

co(gen);
```

## 2.使用Generator函数和Promise实现的异步流程控制

### ①实现返回promise-promisify

```js
// 包装为promise，await后面的表达式都是被包装成promise
const promisify = (fn) => {
  return (...args) => {
    return new Promise((resolve, reject) => {
      // 这里是传进来的读文件的函数的函数调用
      fn(...args, (err, data) => {
        if (err) {
          reject(err);
        }
        resolve(data);
      });
    });
  };
};

// promise化
let asyncReadFile = promisify(fs.readFile);
```

### ②生成器模拟async&await

```js
function* read() {
  let content1 = yield asyncReadFile(
    path.join(__dirname, "./data/name.txt"),
    "utf8"
  );
  let content2 = yield asyncReadFile(
    path.join(__dirname, "./data/" + content1),
    "utf8"
  );
  return content2;
}
```

### ③co函数自动执行生成器对象的next

```js
// 实现co原理：自动执行
function co(it) {
  // it 迭代器
  return new Promise((resolve, reject) => {
    // 异步迭代 需要根据函数来实现
    function autoNext(data) {
      // 递归得有中止条件
      let { value, done } = it.next(data);
      if (done) {
        resolve(value); // 直接让promise变成成功 用当前返回的结果
      } else {
        // 创建一个状态为resolve的promise
        Promise.resolve(value)
          .then((data) => {
            console.log("✅ ~ data:", data);
            console.log("✅ ~ value:", value);
            autoNext(data);
          })
          .catch((err) => {
            reject(err);
          });
      }
    }
    // 首次调用
    autoNext();
  });
}
```

### ④完整代码

```js
const fs = require("fs");
const path = require("path");

// 包装为promise，await后面的表达式都是被包装成promise
const promisify = (fn) => {
  return (...args) => {
    return new Promise((resolve, reject) => {
      // 这里是传进来的读文件的函数的函数调用
      fn(...args, (err, data) => {
        if (err) {
          reject(err);
        }
        resolve(data);
      });
    });
  };
};

// promise化
let asyncReadFile = promisify(fs.readFile);

function* read() {
  let content1 = yield asyncReadFile(
    path.join(__dirname, "./data/name.txt"),
    "utf8"
  );
  let content2 = yield asyncReadFile(
    path.join(__dirname, "./data/" + content1),
    "utf8"
  );
  return content2;
}

// 实现co原理：自动执行，从上往下await依次执行，只有上一个完成，流程才不会阻塞
function co(it) {
  console.log("✅ ~ 生成器it:", it);
  // it 迭代器
  return new Promise((resolve, reject) => {
    // 异步迭代 需要根据函数来实现
    function autoNext(data) {
      console.log("✅ ~ data首次调用传递的data:", data);
      // 递归得有中止条件
      let { value, done } = it.next(data);
      if (done) {
        resolve(value); // 直接让promise变成成功 用当前返回的结果
      } else {
        // 创建一个状态为resolve的promise
        Promise.resolve(value)
          .then((data) => {
            console.log("✅ ~ data:", data);
            console.log("✅ ~ value:", value);
            autoNext(data);
          })
          .catch((err) => {
            reject(err);
          });
      }
    }
    // 首次调用
    autoNext();
  });
}

co(read())
  .then((res) => {
    console.log("✅ ~ res:", res);
  })
  .catch((err) => {
    console.log("✅ ~ err:", err);
  });

```

