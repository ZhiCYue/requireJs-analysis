/**==============================
 * 常用的js 辅助方法
 * 
 * @author zcyue
 * @date 2019-01-01
 ===============================*/

/**
 * 判断是否为方法
 * @param {*} it 
 */
function isFunction(it) {
	return Object.prototype.toString.call(it) === '[object Function]';
}

/**
 * 判断是否为数组
 * @param {*} it 
 */
function isArray(it) {
	return Object.prototype.toString.call(it) === '[object Array]';
}


/**
 * 对象拥有对应属性
 * @param {*} obj 
 * @param {*} prop 
 */
function hasProp(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

/**
 * 如果对象有对应属性，则返回，没有则返回false
 * @param {*} obj 
 * @param {*} prop 
 */
function getOwn(obj, prop) {
  return hasProp(obj, prop) && obj[prop];
}

/**
 * 遍历数组，并执行对应方法
 * @param {*} ary 
 * @param {*} func 
 */
function each(ary, func) {
  if (ary) {
      var i;
      for (i = 0; i < ary.length; i += 1) {
          if (ary[i] && func(ary[i], i, ary)) {
              break;
          }
      }
  }
}

/**
 * 逆序遍历数组，执行对应方法
 * @param {*} ary 
 * @param {*} func 
 */
function eachReverse(ary, func) {
  if (ary) {
      var i;
      for (i = ary.length - 1; i > -1; i -= 1) {
          if (ary[i] && func(ary[i], i, ary)) {
              break;
          }
      }
  }
}

/**
 * 遍历对象，执行响应方法
 * @param {*} obj 
 * @param {*} func 
 */
function eachProp(obj, func) {
  var prop;
  for (prop in obj) {
      if (hasProp(obj, prop)) {
          if (func(obj[prop], prop)) {
              break;
          }
      }
  }
}

/**
 * 深拷贝
 * @param {*} target 
 * @param {*} source 
 * @param {*} force 
 * @param {*} deepStringMixin 
 */
function mixin(target, source, force, deepStringMixin) {
  if (source) {
      eachProp(source, function (value, prop) {
          if (force || !hasProp(target, prop)) {
              if (deepStringMixin && typeof value === 'object' && value &&
                  !isArray(value) && !isFunction(value) &&
                  !(value instanceof RegExp)) {

                  if (!target[prop]) {
                      target[prop] = {};
                  }
                  mixin(target[prop], value, force, deepStringMixin);
              } else {
                  target[prop] = value;
              }
          }
      });
  }
  return target;
}

/**
 * 作用于绑定
 * @param {*} obj 
 * @param {*} fn 
 */
function bind(obj, fn) {
  return function () {
      return fn.apply(obj, arguments);
  };
}
