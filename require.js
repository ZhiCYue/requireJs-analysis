/** 简化版 */

var require, define;

(function () {
    var req,
        version = '2.3.6',
        defContextName = '_',
        contexts = {},
        cfg = {},
        globalDefQueue = [];

    function newContext(contextName) {
        var Module, context,
            config = {
                baseUrl: './',
                paths: {},
                config: {}
            },
            registry = {},
            defQueue = [],
            defined = {},
            requireCounter = 1;

        function makeModuleMap(name) {
            var url;

            if (!name) {
                name = '_@r' + (requireCounter += 1);
            }
            url = context.nameToUrl(name);

            return {
                name: name,
                url: url,
                id: name
            };
        }

        function getModule(depMap) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (!mod) {
                mod = registry[id] = new context.Module(depMap);
            }

            return mod;
        }

        function on(depMap, name, fn) {
            var mod = getModule(depMap);
            mod.on(name, fn);
        }

        function cleanRegistry(id) {
            delete registry[id];
        }

        function callGetModule(args) {
            if (!hasProp(defined, args[0])) {
                getModule(makeModuleMap(args[0])).init(args[1], args[2]);
            }
        }

        Module = function (map) {
            this.events = {};
            this.map = map;
            // depMaps 存放依赖的脚本/模块
            // depExports 存放依赖模块回调的执行结果
            // depMatched 存放依赖模块回调是否处理，true/false
            // 三者均为数组，索引对应相同模块
            this.depMaps = [];
            this.depExports = [];
            this.depMatched = [];
            this.depCount = 0;
        };

        Module.prototype = {
            init: function (depMaps, factory, errback, options) {
                options = options || {};
                if (this.inited) return;

                this.factory = factory;

                this.depMaps = depMaps && depMaps.slice(0);
                this.inited = true;

                this.enable();
            },

            defineDep: function (i, depExports) {
                if (!this.depMatched[i]) {
                    this.depMatched[i] = true;
                    this.depCount -= 1;
                    this.depExports[i] = depExports;
                }
            },

            fetch: function () {
                if (this.fetched) return;
                this.fetched = true;

                context.startTime = (new Date()).getTime();
                return this.load();
            },

            load: function () {
                var url = this.map.url;
                context.load(this.map.id, url);
            },

            // 检查依赖是否都已经加载，如果加载，触发defined 事件
            check: function () {

                var id = this.map.id,
                    depExports = this.depExports,
                    exports = this.exports,
                    factory = this.factory;

                if (!this.inited) {
                    if (!hasProp(context.defQueueMap, id)) {
                        this.fetch();
                    }
                } else {
                    if (this.depCount < 1 && !this.defined) {
                        if (isFunction(factory)) {
                            exports = factory.apply(exports, depExports);
                        } else {
                            exports = factory;
                        }
                        this.exports = exports;
                        cleanRegistry(id);
                        this.defined = true;
                    }

                    if (this.defined) {
                        this.emit('defined', this.exports);
                    }
                }
            },

            enable: function () {
                each(this.depMaps, bind(this, function (depMap, i) {
                    if (typeof depMap === 'string') {
                        depMap = makeModuleMap(depMap);
                        this.depMaps[i] = depMap;
                        this.depCount += 1;

                        on(depMap, 'defined', bind(this, function (depExports) {
                            this.defineDep(i, depExports);
                            this.check();
                        }));

                    }
                    context.enable(depMap, this);
                }));

                if (this.depMaps.length === 0) this.check();
            },

            on: function (name, cb) {
                var cbs = this.events[name];
                if (!cbs) {
                    cbs = this.events[name] = [];
                }
                cbs.push(cb);
            },

            emit: function (name, evt) {
                each(this.events[name], function (cb) {
                    cb(evt);
                });

            }
        };

        context = {
            config: config,
            contextName: contextName,
            registry: registry,
            defined: defined,
            defQueue: defQueue,
            defQueueMap: {},
            Module: Module,

            configure: function (cfg) {
                // 把配置存储到context 的config 中
                eachProp(cfg, function (value, prop) {
                    config[prop] = value;
                });

                if (cfg.deps || cfg.callback) {
                    context.require(cfg.deps || [], cfg.callback);
                }
            },

            makeRequire: function () {

                // context 的require 方法
                function localRequire(deps, callback, errback) {

                    if (deps.length === 0) return;

                    // （个人理解）
                    // 这里增加setTimeout 是需要把处理逻辑放本次循环中的 load 监听处理之后
                    setTimeout(function () {
                        context.defQueueMap = {};

                        var requireMod = getModule(makeModuleMap(null));

                        // 把入口脚本传入
                        requireMod.init(deps, callback, errback, {
                            enabled: true
                        });
                    }, 4);
                    return localRequire;
                }

                return localRequire;
            },

            enable: function (depMap) {
                var mod = getOwn(registry, depMap.id);
                if (mod) {
                    getModule(depMap).enable();
                }
            },

            completeLoad: function (moduleName) {
                var found, args, mod;

                if (globalDefQueue.length) {
                    each(globalDefQueue, function (queueItem) {
                        var id = queueItem[0];
                        if (typeof id === 'string') {
                            context.defQueueMap[id] = true;
                        }
                        defQueue.push(queueItem);
                    });
                    globalDefQueue = [];
                }

                while (defQueue.length) {
                    args = defQueue.shift();
                    if (args[0] === null) {
                        args[0] = moduleName;

                        if (found) {
                            break;
                        }
                        found = true;
                    } else if (args[0] === moduleName) {
                        found = true;
                    }

                    callGetModule(args);
                }
                context.defQueueMap = {};

                mod = getOwn(registry, moduleName);

                if (!found && !hasProp(defined, moduleName) && mod && !mod.inited) {
                    callGetModule([moduleName, [], undefined]);
                }

            },

            nameToUrl: function (moduleName) {
                var url = moduleName + '.js';
                url = (url.charAt(0) === '/' || url.match(/^[\w\+\.\-]+:/) ? '' : config.baseUrl) + url;
                return url;
            },

            load: function (id, url) {
                req.load(context, id, url);
            },

            onScriptLoad: function (evt) {
                var node = evt.currentTarget || evt.srcElement;
                if (evt.type === 'load' || (/^(complete|loaded)$/.test((node).readyState))) {
                    let requiremodule = node.getAttribute('data-requiremodule');
                    context.completeLoad(requiremodule);
                }
            }
        };

        context.require = context.makeRequire();
        return context;
    }

    // define 方法
    define = function (name, deps, callback) {
        if (typeof name !== 'string') {
            callback = deps;
            deps = name;
            name = null;
        }

        if (!isArray(deps)) {
            callback = deps;
            deps = null;
        }

        globalDefQueue.push([name, deps, callback]);
    };

    // require 方法
    req = function (deps, callback, errback, optional) {
        var context, config,
            contextName = defContextName;

        if (!isArray(deps) && typeof deps !== 'string') {
            config = deps;
            if (isArray(callback)) {
                deps = callback;
                callback = errback;
                errback = optional;
            } else {
                deps = [];
            }
        }

        context = getOwn(contexts, contextName);
        if (!context) context = contexts[contextName] = newContext(contextName);
        if (config) context.configure(config);

        return context.require(deps, callback, errback);
    };

    // 赋值给全局变量require
    if (!require) {
        require = req;
    }

    req.version = version;

    // 异步加载js 脚本
    req.load = function (context, moduleName, url) {
        var node = document.createElement('script');
        node.type = 'text/javascript';
        node.charset = 'utf-8';
        node.async = true;
        node.setAttribute('data-requirecontext', context.contextName);
        node.setAttribute('data-requiremodule', moduleName);
        node.addEventListener('load', context.onScriptLoad, false);
        node.src = url;

        var head = document.getElementsByTagName('head')[0];
        head.appendChild(node);

        return node;
    };

    // 获取包含data-main 属性的script 标签，并初始化配置cfg
    let scripts = document.getElementsByTagName('script');
    eachReverse(scripts, function (script) {
        let dataMain = script.getAttribute('data-main');
        if (dataMain) {
            let mainScript = dataMain;

            if (!cfg.baseUrl && mainScript.indexOf('!') === -1) {
                let src = mainScript.split('/');
                mainScript = src.pop();
                cfg.baseUrl = src.length ? src.join('/') + '/' : './';
            }

            mainScript = mainScript.replace(/\.js$/, '');
            cfg.deps = cfg.deps ? cfg.deps.concat(mainScript) : [mainScript];
            return true;
        }
    });

    req(cfg);
}());
