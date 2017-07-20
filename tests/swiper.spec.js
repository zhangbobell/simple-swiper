var rewire = require('rewire');

var deviceModule = rewire('./src/device.js');
var swiperModule = rewire('./src/swiper.js');

var Swiper = swiperModule.__get__('Swiper');

describe('test swiper', function () {
    document.body.innerHTML = '<div class="outer-container" style="width: 400px; height: 650px;"></div>';

    var data = [{
        content: '<img src="//kityminder-img.cdn.bcebos.com/01.png" alt="01" width="100%" height="100%">'
    }, {
        content: '<img src="//kityminder-img.cdn.bcebos.com/02.png" alt="02" width="100%" height="100%">'
    }, {
        content: '<img src="//kityminder-img.cdn.bcebos.com/03.png" alt="03" width="100%" height="100%">'
    }];

    var mockStartPoint = {
        X: 100,
        Y: 100
    };

    var mockUpMovingPoint = {
        X: 100,
        Y: 90
    };

    var mockDownMovingPoint = {
        X: 100,
        Y: 110
    };

    var mockRightMovingPoint = {
        X: 110,
        Y: 100
    }

    var swiper;

    jest.useFakeTimers();    

    beforeEach(() => {
        swiper = new Swiper({
            container: document.querySelector('.outer-container'),
            data: data,
            initIndex: 1,
            keepDefaultClass: ['keep-default']
        });
    });

    describe('test handleEvent', () => {

        test('test mousedown left button event', () => {
            let event = {
                type: 'mousedown',
                button: 0,
                preventDefault: jest.fn()
            };
            swiper.keepDefaultHandler = jest.fn();
            swiper.startHandler = jest.fn();

            swiper.handleEvent(event);

            expect(swiper.keepDefaultHandler).toBeCalled();
            expect(swiper.startHandler).toBeCalled();
        });
    });
})