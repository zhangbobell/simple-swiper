/**
 * @file swiper.js: swiper 的主文件
 *
 * @author zhangbobell
 *
 * @email：zhangbo21@baidu.com
 * @created: 2017.07.18
 */

var Swiper = (function () {
    /**
     * 页面滑动方向
     * @const
     * @type {Object}
     */
    var DIRECTION = {
        forward: -1,
        backward: 1,
        nonward: 0
    };

    /**
     * 坐标轴正交方向
     * @const
     * @type {Object}
     */
    var OPPSITE = {
        X: 'Y',
        Y: 'X'
    };

    /**
     * 空页面
     * @const
     * @type {Object}
     */
    var EMPTY_PAGE = document.createElement('div');

    var EMPTY_FUNCTION = function () {};
    var ORIGIN_POINT = {X: 0, Y: 0};

    function Swiper(options) {
        this.$container = options.container;
        this.debug = options.debug || false;
        this.data = options.data || [];
        this.axis = options.vertical ? 'Y' : 'X';
        this.initIndex = options.initIndex || 0;
        this.loop = options.loop || false;
        this.frr = options.frr > -1 ? parseInt(options.frr, 10) : 10;
        this.sideLength = this.axis === 'X' ? this.$container.clientWidth : this.$container.clientHeight;
        this.keepDefaultClasses = options.keepDefaultClasses || [];

        this.transition = {
            duration: 800
        };

        if (options.transition) {
            for (var k in options.transition) {
                if (options.transition.hasOwnProperty(k)) {
                    this.transition[k] = options.transition[k];
                }
            }
        }

        this._listeners = {};

        // 页面在动
        this.sliding = false;
        // 手指在动
        this.moving = false;
        this.start = ORIGIN_POINT;
        this.end = ORIGIN_POINT;
        this.offset = ORIGIN_POINT;

        // 是否换页
        this.pageChange = false;
        this.moveDirection = DIRECTION.nonward;
        this.activePage = EMPTY_PAGE;
        this.lastActivePage = EMPTY_PAGE;
        this.log = this.debug ? console.log.bind(window.console) : EMPTY_FUNCTION;

        this.bindEvents();
        this.initRender();
    }

    /**
     * getDirectionKey: 由 DIRECTION 的 value(1, -1) 获取 key(backward, forward)
     *
     * @param {number} direction: DIERECTION 的值
     *
     * @return {string} key: DIRECTION 的键名
     */
    Swiper.prototype.getDirectionKey = function (direction) {
        for (var key in DIRECTION) {
            if (DIRECTION.hasOwnProperty(key) && DIRECTION[key] === direction) {
                return key;
            }

        }
    };

    Swiper.prototype.bindEvents = function () {
        this.$container.addEventListener(Swiper.Device.startEvent, this);
        this.$container.addEventListener(Swiper.Device.moveEvent, this);
        window.addEventListener(Swiper.Device.endEvent, this);
        window.addEventListener(Swiper.Device.resizeEvent, this, false);
    };

    Swiper.prototype.unbindEvents = function () {
        this.$container.removeEventListener(Swiper.Device.startEvent, this);
        this.$container.removeEventListener(Swiper.Device.moveEvent, this);
        window.removeEventListener(Swiper.Device.endEvent, this);
        window.removeEventListener(Swiper.Device.resizeEvent, this, false);
    };

    Swiper.prototype.handleEvent = function (event) {
        var deviceEvent = Swiper.Device.getDeviceEvent(event);

        switch (deviceEvent.type) {
            case 'mousedown':
                if (deviceEvent.button !== 0) {
                    break;
                }

            case 'touchstart':
                this.keepDefaultHandler(deviceEvent);
                this.startHandler(deviceEvent.position);
                break;
            case Swiper.Device.moveEvent:
                this.keepDefaultHandler(deviceEvent);
                this.moveHandler(deviceEvent.position);
                break;
            case Swiper.Device.endEvent:
            case Swiper.Device.cancelEvent:
                this.endHandler();
                break;
            case Swiper.Device.resizeEvent:
                this.resizeHandler();
                break;
            default:
                break;
        }
    };

    Swiper.prototype.keepDefaultHandler = function (event) {
        if (event.target && /^(input|textarea|a|select)$/i.test(event.target.tagName)) {
            return;
        }

        var keepDefaultClasses = this.keepDefaultClasses;
        for (var i = 0; i < keepDefaultClasses.length; i++) {
            if (event.target.classList.contains(keepDefaultClasses[i])) {
                return;
            }

        }

        event.preventDefault();
    };

    Swiper.prototype.startHandler = function (position) {
        if (this.sliding) {
            return;
        }

        this.moving = true;

        this.log('start');

        this.startTime = new Date().getTime();
        this.start = position;

        // 设置翻页动画
        this.transition = this.currentPage.transition || this.transition;

        this.fire('swipeStart');
    };

    Swiper.prototype.moveHandler = function (position) {
        if (this.sliding || !this.moving) {
            return;
        }

        this.log('moving');

        this.end = position;

        this.offset = {
            X: this.end.X - this.start.X,
            Y: this.end.Y - this.start.Y
        };

        // 小于 FRR 的不响应
        if (Math.abs(this.offset[this.axis]) < this.frr) {
            return;
        }

        if (this.offset[this.axis] < 0) {
            this.moveDirection = DIRECTION.forward;
            this.lastActivePage = this.activePage;
            this.activePage = this.currentPage.next;
        }
        else if (this.offset[this.axis] > 0) {
            this.moveDirection = DIRECTION.backward;
            this.lastActivePage = this.activePage;
            this.activePage = this.currentPage.prev;
        }
        else {
            this.moveDirection = DIRECTION.nonward;
            this.lastActivePage = this.activePage;
            this.activePage = EMPTY_PAGE;
        }

        this.fire('swipeMoving');

        if (this.activePage !== this.lastActivePage && this.activePage !== EMPTY_PAGE) {
            this.fire('activePageChanged');
        }

        // 消除 FRR 的影响
        this.offset[this.axis] = this.offset[this.axis] - this.moveDirection * this.frr;

        var directionKey = this.getDirectionKey(this.moveDirection);

        if (this.activePage === EMPTY_PAGE
            || this.transition.direction === DIRECTION.nonward
            || (this.transition.direction && this.transition.direction !== this.moveDirection)) {
            this.offset[this.axis] = 0;
        }

        var GAP = {
            forward: 20,
            backward: this.sideLength - 20
        };

        // 判断是否接近边缘
        if (this.moveDirection * this.end[this.axis] > this.moveDirection * GAP[directionKey]) {
            var logStr = this.moveDirection === DIRECTION.forward ? '<--- near edge' : 'near edge --->';
            this.log(logStr);
            return this.endHandler();
        }

        this.pageChange = true;

        this.render();
    };

    Swiper.prototype.endHandler = function () {
        if (this.sliding || !this.moving) {
            return;
        }

        this.moving = false;
        this.log('end');

        // 如果禁止滑动
        if (this.transition.direction === DIRECTION.nonward
            || (this.transition.direction && this.transition.direction !== this.moveDirection)) {
            this.offset[this.axis] = 0;
        }

        this.endTime = new Date().getTime();

        var moveTime = this.endTime - this.startTime;
        var threshold = moveTime > 300 ? this.sideLength / 3 : 14;
        // 是否在沿着axis滑动
        var absOffset = Math.abs(this.offset[this.axis]);
        var absReverseOffset = Math.abs(this.offset[OPPSITE[this.axis]]);
        var isSwipeOnTheDir = absReverseOffset < absOffset;

        if (absOffset >= threshold && isSwipeOnTheDir) {
            this.pageChange = true;
            this._swipeTo();
        }
        else {
            this.moveDirection = -1 * this.moveDirection;
            this.pageChange = false;
            this._swipeTo();
            this.fire('swipeRestore');
        }
    };

    Swiper.prototype.resizeHandler = function () {
        if (!this.sliding && !this.moving) {
            this.sideLength = this.axis === 'X' ? this.$container.clientWidth : this.$container.clientHeight;
        }

    };

    Swiper.prototype._swipeTo = function () {
        if (this.sliding) {
            return;
        }

        this.sliding = true;

        var requestAnimationFrame = window.requestAnimationFrame
        || window.mozRequestAnimationFrame
        || window.webkitRequestAnimationFrame
        || window.msRequestAnimationFrame;

        var startTick = null;
        var startOffset = this.offset[this.axis];
        var velocity = this.sideLength / this.transition.duration;

        var boundary = {
            forward: {
                unSwipe: 0,
                swipe: -this.sideLength
            },
            backward: {
                unSwipe: 0,
                swipe: this.sideLength
            },
            nonward: 0
        };

        var type = this.pageChange ? 'swipe' : 'unSwipe';
        var directionKey = this.getDirectionKey(this.moveDirection);
        var b = boundary[directionKey][type] || 0;

        function step(timestamp) {
            if (startTick === null) {
                startTick = timestamp;
            }

            this.offset[this.axis] = startOffset + (timestamp - startTick) * this.moveDirection * velocity;
            if (this.moveDirection * this.offset[this.axis] < this.moveDirection * b) {
                this.render();
                requestAnimationFrame(step.bind(this));
            }
            else {
                // the last frame
                this.offset[this.axis] = b;
                this.render();
            }
        }

        requestAnimationFrame(step.bind(this));
    };

    Swiper.prototype.swipeTo = function (toIndex, transition) {
        var currentIndex = this.currentPage.index;
        this.moveDirection = DIRECTION.nonward;
        this.pageChange = true;

        if (toIndex > currentIndex) {
            this.moveDirection = DIRECTION.forward;
        }
        else if (toIndex < currentIndex) {
            this.moveDirection = DIRECTION.backward;
        }

        this.offset[this.axis] = this.moveDirection;

        var activeIndex = this.loop ? (toIndex + this.data.length) % this.data.length : toIndex;
        this.activePage = this.$pages[activeIndex] || EMPTY_PAGE;

        if (activeIndex === currentIndex || this.activePage === EMPTY_PAGE) {
            this.moveDirection = DIRECTION.nonward;
            this.offset[this.axis] = 0;
            this.pageChange = false;
        }

        this.transition = transition || this.currentPage.transition || this.transition;
        this._swipeTo();
    };

    Swiper.prototype.on = function (eventName, callback) {
        var eventNames = eventName.split(' ');
        eventNames.forEach(function (eventName) {
            if (!this._listeners[eventName]) {
                this._listeners[eventName] = [];
            }

            this._listeners[eventName].push(callback);
        }.bind(this));
        return this;
    };

    Swiper.prototype.off = function (eventName, callback) {
        if (this._listeners[eventName]) {
            var index = this._listeners[eventName].indexOf(callback);
            if (index > -1) {
                this._listeners[eventName].splice(index, 1);
            }
        }

        return this;
    };

    Swiper.prototype.fire = function (eventName, event) {
        event = event || {};
        if (this._listeners[eventName]) {
            event.name = eventName;
            this._listeners[eventName].forEach(function (callback) {
                callback.call(this, event);
            }.bind(this));
        }

        return this;
    };

    Swiper.prototype.destroy = function () {
        this.unbindEvents();
        this._listeners = {};
        this.$container.style.overflow = '';
        this.$swiper.parentElement.removeChild(this.$swiper);

        this.fire('destroy');
    };

    Swiper.prototype.initRender = function () {
        this.$swiper = document.createElement('div');
        this.$swiper.classList.add('lg-swiper');
        this.$pages = this.data.map(function (page, index) {
            var $page = document.createElement('div');
            $page.classList.add('lg-swiper-page');

            if (typeof page.content === 'string') {
                $page.innerHTML = page.content;
            }
            else {
                $page.appendChild(page.content);
            }

            $page.index = index;
            $page.transition = page.transition;

            if (this.initIndex === index) {
                $page.classList.add('current');
                this.currentPage = $page;
            }

            this.$swiper.appendChild($page);

            return $page;
        }.bind(this));

        this.$pages.forEach(function ($page, index, $pages) {
            var prevIndex = this.loop ? ($pages.length + index - 1) % $pages.length : (index - 1);
            var nextIndex = this.loop ? ($pages.length + index + 1) % $pages.length : (index + 1);

            $page.prev = this.$pages[prevIndex] || EMPTY_PAGE;
            $page.next = this.$pages[nextIndex] || EMPTY_PAGE;
        }.bind(this));

        this.$container.style.overflow = 'hidden';
        this.$container.appendChild(this.$swiper);
    };

    Swiper.prototype.render = function () {
        var axis = this.axis;
        var sideOffset = this.offset[axis];

        // 撤销旧样式
        if (this.lastActivePage !== this.activePage) {
            this.lastActivePage.classList.remove('active');
            this.lastActivePage.style.cssText = '';

            if (this.activePage !== EMPTY_PAGE) {
                this.activePage.classList.add('active');
            }
        }

        this.log('offset : ' + sideOffset);

        // 回弹
        if (this.pageChange === false && sideOffset === 0) {
            this.$swiper.style.cssText = '';
            this.currentPage.style.cssText = '';
            this.activePage.style.cssText = '';

            this.activePage.classList.remove('active');
            this.activePage = EMPTY_PAGE;
            this.lastActivePage = EMPTY_PAGE;

            this.sliding = false;

            this.pageChange = false;

            return this.fire('swipeRestored');
        }

        // 正常翻页
        else if (this.pageChange === true && sideOffset === this.moveDirection * this.sideLength) {
            this.$swiper.style.cssText = '';
            this.currentPage.style.cssText = '';
            this.activePage.style.cssText = '';

            this.currentPage.classList.remove('current');
            this.activePage.classList.remove('active');

            this.activePage.classList.add('current');

            this.currentPage = this.activePage;
            this.activePage = EMPTY_PAGE;
            this.lastActivePage = EMPTY_PAGE;

            this.offset.X = 0;
            this.offset.Y = 0;

            this.sliding = false;

            this.pageChange = false;

            return this.fire('swipeChanged');
        }

        // 普通渲染：计算
        var transform = this.slide({
            axis: axis,
            sideOffset: sideOffset,
            sideLength: this.sideLength
        });

        this.currentPage.style.cssText = transform.currentPage;

        // no one could add class or cssText to EMPTY_PAGE
        if (this.activePage !== EMPTY_PAGE) {
            this.activePage.style.cssText = transform.activePage;
        }

    };

    Swiper.prototype.slide = function (swiper) {
        var axis = swiper.axis;
        var sideOffset = swiper.sideOffset;
        var sideLength = swiper.sideLength;
        var sign = this.sign(sideOffset);

        return {
            currentPage: '-webkit-transform: translateZ(0) translate' + axis + '(' + sideOffset + 'px);',
            activePage: '-webkit-transform: translateZ(0) translate'
                + axis + '(' + (sideOffset - sign * sideLength) + 'px);'
        };
    };

    Swiper.prototype.sign = function (x) {
        x = +x;

        if (x === 0 || isNaN(x)) {
            return 0;
        }

        return x > 0 ? 1 : -1;
    };

    return Swiper;
}());

Swiper.Device = new Device(window);
