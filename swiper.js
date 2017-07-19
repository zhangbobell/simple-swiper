(function (global) {

    var hasTouch = !!(('ontouchstart' in global && !/Mac OS X /.test(global.navigator.userAgent)) || global.DocumentTouch && document instanceof global.DocumentTouch);
    var DEVICE = {
        hasTouch: hasTouch,
        startEvent: hasTouch ? 'touchstart' : 'mousedown',
        moveEvent: hasTouch ? 'touchmove' : 'mousemove',
        endEvent: hasTouch ? 'touchend' : 'mouseup',
        cancelEvent: hasTouch ? 'touchcancel' : 'mouseout',
        resizeEvent: 'onorientationchange' in global ? 'orientationchange' : 'resize'
    };

    /**
     * 页面滑动方向
     * @const
     * @type {Object}
     */
    var DIRECTION = {
        forward: -1,
        backward: 1,
        nonward: 0
    }

    /**
     * 坐标轴正交方向
     * @const
     * @type {Object}
     */
    var OPPSITE = {
        X: 'Y',
        Y: 'X'
    }

    /**
     * 空页面
     * @const
     * @type {Object}
     */
    var EMPTY_PAGE = document.createElement('div');

    var EMPTY_FUNCTION = function () {};


    function Swiper(options) {
        this.$container = options.container;
        this.debug = options.debug || false;
        this.data = options.data || [];
        this.axis = options.vertical ? 'Y' : 'X';
        this.initIndex = options.initIndex || 0;
        this.loop = options.loop || false;
        this.fingerRecognitionRange = options.fingerRecognitionRange > -1 ? parseInt(options.fingerRecognitionRange) : 10;
        this.sideLength = this.axis === 'X' ? this.$container.clientWidth : this.$container.clientHeight;
        this.keepDefaultClasses = options.keepDefaultClasses || [];
        
        this.transition = {
            type: 'slide',
            duration: 800
        };

        if(options.transition){
            for(var k in options.transition){
                this.transition[k] = options.transition[k];
            }
        }

        this.listeners = {};
        Swiper.EVENTS.forEach(function (eventName) {
            var capitalized = eventName.replace(/^\w{1}/, function (m) {
                return m.toUpperCase();
            });
            var fn = options['on' + capitalized];
            
            typeof fn === 'function' && this.on(eventName, fn);
        }.bind(this)); 



        // 页面在动
        this.sliding = false;
        // 手指在动
        this.moving = false;
        this.start = {X: 0, Y: 0};
        this.end = {X: 0, Y: 0};
        this.offset = {X: 0, Y: 0};

        // 是否换页
        this.pageChange = false;
        this.moveDirection = DIRECTION.nonward;
        this.activePage = EMPTY_PAGE;
        this.lastActivePage = EMPTY_PAGE;

        this.bindEvents();
        this.initRender();
    }

    Swiper.EVENTS = [
        'initialize',
        'initialized',
        'renderComplete',
        'swipeBeforeStart',
        'swipeStart',
        'swipeChange',
        'swipeChanged',
        'swipeRestore',
        'swipeRestored',
        // 'reset',
        'destroy'
    ];
    
    Swiper.prototype.log = this.debug ? console.log.bind(window.console) : EMPTY_FUNCTION;


    Swiper.prototype.bindEvents = function () {
		this.$container.addEventListener(DEVICE.startEvent, this);
		this.$container.addEventListener(DEVICE.moveEvent, this);
		global.addEventListener(DEVICE.endEvent, this);
        global.addEventListener(DEVICE.resizeEvent, this, false);
    }

    Swiper.prototype.unbindEvents = function () {
        this.$container.removeEventListener(DEVICE.startEvent, this);
		this.$container.removeEventListener(DEVICE.moveEvent, this);
		global.removeEventListener(DEVICE.endEvent, this);
        global.removeEventListener(DEVICE.resizeEvent, this, false);
    }

    Swiper.prototype.handleEvent = function (event) {
        switch (event.type) {
            case 'mousedown':
                if (event.button !== 0) {
                    break;
                }
            case 'touchstart':
                this.keepDefaultHandler(event);
                this.startHandler(event);
                break;
            case DEVICE.moveEvent:
                this.keepDefaultHandler(event);
                this.moveHandler(event);
                break;
            case DEVICE.endEvent:
            case DEVICE.cancelEvent:
                // mouseout, touchcancel event, trigger endEvent
                this.endHandler(event);
                break;
            case DEVICE.resizeEvent:
                this.resizeHandler();
                break;
            default:
                break;
        }
    }

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

    Swiper.prototype.startHandler = function (event){
    	if(this.sliding){
    		return;
    	}

        this.moving = true;

        this.log('start');
    
        this.startTime = new Date().getTime();

        this.start.X = DEVICE.hasTouch ? event.targetTouches[0].pageX : event.pageX;
        this.start.Y = DEVICE.hasTouch ? event.targetTouches[0].pageY : event.pageY;

        // 设置翻页动画
        this.transition = this.currentPage.transition || this.transition;

        this.fire('swipeBeforeStart');
    }

    Swiper.prototype.moveHandler = function (event) {        
        if(this.sliding || !this.moving){
    		return;
    	}

        this.log('moving');

        this.end.X = DEVICE.hasTouch ? event.targetTouches[0].pageX : event.pageX;
        this.end.Y = DEVICE.hasTouch ? event.targetTouches[0].pageY : event.pageY;

        this.offset = {
            X: this.end.X - this.start.X,
            Y: this.end.Y - this.start.Y
        };

        // 小于 FRR 的不响应
        if (Math.abs(this.offset[this.axis]) < this.fingerRecognitionRange) {
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

        if (this.activePage !== this.lastActivePage && this.activePage !== EMPTY_PAGE) {
            this.fire('activePageChanged');
        }

        // 消除 FRR 的影响
        this.offset[this.axis] = this.offset[this.axis] - this.moveDirection * this.fingerRecognitionRange;

        // 如果允许滑动并且 activePage 不为空
        if (this.activePage !== EMPTY_PAGE
        && (this.transition.direction === undefined || this.transition.direction === this.moveDirection)) {
            this.pageChange = true;

            this.render();

            var GAP = {
                forward: 20,
                backward: this.sideLength - 20
            };

            if (this.moveDirection === DIRECTION.forward && this.end[this.axis] < GAP.forward) {
                this.log('<--- near edge');
                this.endHandler();
                
            }
            else if (this.moveDirection === DIRECTION.backward && this.end[this.axis] > GAP.backward) {
                this.log('near edge --->');
                this.endHandler();
            }
        }
    }

    Swiper.prototype.endHandler = function () {
        if(this.sliding || !this.moving){
    		return;
    	}
        
        this.moving = false;
        this.log('end');

        // 如果禁止滑动
        if ((this.transition.direction && this.transition.direction !== this.moveDirection)
        || this.transition.direction === DIRECTION.nonward) {
            return;
        }

        this.endTime = new Date().getTime();     
        
        var moveTime = this.endTime - this.startTime;
        var threshold = moveTime > 300 ? this.sideLength / 3 : 14;

        var sideOffset = this.offset[this.axis];
        var absOffset = Math.abs(this.offset[this.axis]);
        var absReverseOffset = Math.abs(this.offset[OPPSITE[this.axis]]);
        var isSwipeOnTheDir = absReverseOffset < absOffset; // 是否在沿着axis滑动

        var currentIndex = this.currentPage.index;
        
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
    }

    Swiper.prototype._swipeTo = function () {
        if (this.sliding) {
            return;
        }

        // 如果 activePage 为空
        if (this.activePage === EMPTY_PAGE) {
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
        var TOLERANCE = 1000 / 60 * velocity;

        // 回弹的情形        
        function unSwipeStep(timestamp) {
            if (startTick === null) {
                startTick = timestamp;
            }

            this.offset[this.axis] = startOffset + (timestamp - startTick) * this.moveDirection * velocity;
            if (this.moveDirection * this.offset[this.axis] < 0) {

                this.render();
                requestAnimationFrame(arguments.callee.bind(this));
            }
            else {
                // the last frame
                this.offset[this.axis] = 0;
                this.render();
            }
        }

        function swipeStep(timestamp) {
            if (startTick === null) {
                startTick = timestamp;
            }

            this.offset[this.axis] = startOffset + (timestamp - startTick) * this.moveDirection * velocity;
            if (this.moveDirection * this.offset[this.axis] < this.sideLength) {
                
                this.render();
                requestAnimationFrame(arguments.callee.bind(this));
            }
            else {
                // the last frame
                this.offset[this.axis] = this.moveDirection * this.sideLength;
                this.render();
            }
        }

        requestAnimationFrame(this.pageChange ? swipeStep.bind(this) : unSwipeStep.bind(this));
    }

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

        var activeIndex = this.loop ? (toIndex + this.data.length) % this.data.length : toIndex;
        
        // if the same, do nothing
        if (activeIndex === currentIndex) {
            this.pageChange = false;
        }

        this.activePage = this.$pages[activeIndex] || EMPTY_PAGE;
        this.offset[this.axis] = this.moveDirection;
        this.transition = transition || this.transition;

        this._swipeTo();
    }

    Swiper.prototype.on = function (eventName, callback) {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }

        this.listeners[eventName].push(callback);
        return this;
    };

    Swiper.prototype.off = function (eventName, callback) {
        if (this.listeners[eventName]) {
            var index = this.listeners[eventName].indexOf(callback);
            if (index > -1) {
                this.listeners[eventName].splice(index, 1);
            }
        }

        return this; 
    };

    Swiper.prototype.fire = function (eventName) {
        if (this.listeners[eventName]) {
            var args = Array.prototype.slice.call(arguments, 1);
            this.listeners[eventName].forEach(function (callback) {
                callback.apply(this, args);
            }.bind(this));
        }

        return this;
    };

    Swiper.prototype.render = function () {
        var axis = this.axis;
        var sideOffset = this.offset[axis];
        var obsoleteActivePage = document.querySelector('.active');

        if (obsoleteActivePage) {
            obsoleteActivePage.classList.remove('active');
            obsoleteActivePage.style.cssText = '';                
        }
        
        this.currentPage.style.cssText = '';
        this.activePage.style.cssText = '';

        this.log('offset : ' + sideOffset);
        var activeTranslate = this.pageChange
        ? sideOffset - this.moveDirection * this.sideLength
        : sideOffset + this.moveDirection * this.sideLength;
        
        this.activePage.classList.add('active');
        this.currentPage.style.webkitTransform = 'translateZ(0) translate' + axis + '(' + sideOffset + 'px)';
        this.activePage.style.webkitTransform = 'translateZ(0) translate' + axis + '(' + activeTranslate + 'px)';

        // 回弹
        if (this.pageChange === false && sideOffset === 0) {
            this.currentPage.style.cssText = '';
            this.activePage.style.cssText = '';
            
            this.activePage.classList.remove('active')  
            this.activePage = EMPTY_PAGE;

            this.sliding = false;
            
            this.pageChange = false;
        }

        // 正常翻页
        if (this.pageChange === true && sideOffset === this.moveDirection * this.sideLength) {
            this.currentPage.style.cssText = '';
            this.activePage.style.cssText = '';
            
            this.currentPage.classList.remove('current');            
            this.activePage.classList.remove('active')            

            this.activePage.classList.add('current');
            
            this.currentPage = this.activePage;
            this.activePage = EMPTY_PAGE;

            this.offset.X = 0;
            this.offset.Y = 0;

            this.sliding = false;

            this.pageChange = false;
        }
    }

    Swiper.prototype.initRender = function () {
        this.$swiper = document.createElement('div');
        this.$swiper.classList.add('lg-swiper');
        this.$pages = this.data.map(function (page, index) {
            var $page = document.createElement('div');
            $page.classList.add('lg-swiper-page');

            if(typeof page.content === 'string'){
                $page.innerHTML = page.content;
            }else{
                $page.appendChild(page.content);
            }

			$page.index = index;
            $page.transition = page.transition

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
    }

    global.Swiper = Swiper;
})(window || this);

