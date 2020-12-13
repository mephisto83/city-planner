import potpack, { Box } from './potpack';
export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}
export default class CityLayout {
    size: {
        height: number;
        width: number;
        maxheight?: number;
        maxwidth?: number
    };
    layout: Rect[]
    constructor(size: { height: number, width: number, maxheight?: number, maxwidth?: number }) {
        this.size = size;
        this.layout = []
    }
    static buildCityLayout(boxes: Box[]) {
        let result = potpack.potpack(boxes);
        let layout = new CityLayout({
            height: result.h,
            width: result.w,
            maxheight: result.h,
            maxwidth: result.w
        });
        result.boxes.forEach((box: Box) => {
            layout.insert(this.convertToRect(box))
        })
    }
    static convertToRect(box: Box): Rect {
        return {
            x: box.x,
            y: box.y,
            width: box.w,
            height: box.h
        }
    }
    collides(rect: Rect): boolean {
        if (!this.insideBounds(rect)) {
            return true;
        }
        return this.layout.some((r: Rect) => {
            return this.checkCollision(rect, r)
        })
    }
    getLayouts() {
        return this.layout;
    }
    append(rect: Rect): boolean {
        if (!this.collides(rect)) {
            this.layout.push(rect);
            this.updateSize();
            return true;
        }
        return false;
    }
    insert(rect: Rect): boolean {
        let res = this.append(rect);
        if (!res) {
            let duplicate = this.findSpace(rect);
            res = this.append(duplicate)
        }
        return res;
    }
    copy(rect: Rect): Rect {
        return {
            ...rect
        }
    }
    findSpace(rect: Rect): Rect {
        let duplicate = this.copy(rect);
        if (this.size.maxheight && this.size.maxwidth) {
            for (let i = 0; i < this.size.maxwidth; i++) {
                for (let j = 0; j < this.size.maxheight; j++) {
                    duplicate.x = i;
                    duplicate.y = j;
                    if (!this.collides(duplicate)) {
                        return duplicate;
                    }
                }
            }
        }
        throw new Error('coudnt find space to fit')
    }
    updateSize() {
        let xmin: number | null = null;
        let ymin: number | null = null;
        let xmax: number | null = null;
        let ymax: number | null = null;

        this.layout.forEach((item: Rect) => {
            if (xmin === null) {
                xmin = item.x
            }
            else {
                xmin = Math.min(xmin, item.x)
            }
            if (ymin === null) {
                ymin = item.y
            }
            else {
                ymin = Math.min(ymin, item.y)
            }
            if (xmax === null) {
                xmax = item.x + item.width;
            }
            else {
                xmax = Math.min(xmax, item.width + item.x)
            }
            if (ymax === null) {
                ymax = item.y + item.height
            }
            else {
                ymax = Math.min(ymax, item.height + item.y)
            }
        });

        if (xmax !== null && xmin !== null)
            this.size.width = xmax - xmin;
        if (ymax !== null && ymin !== null)
            this.size.height = ymax - ymin;
    }
    checkCollision(rect1: Rect, rect2: Rect): boolean {

        if (rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y) {
            // collision detected!
            return true;
        }
        return false;
    }
    insideBounds(rect: Rect): boolean {

        if (this.size.maxheight) {
            if (rect.y < 0) {
                return false;
            }
            if ((rect.y + rect.height) > this.size.maxheight) {
                return false;
            }
        }
        if (this.size.maxwidth) {

            if (rect.x < 0) {
                return false;
            }
            if ((rect.x + rect.width) > this.size.maxwidth) {
                return false;
            }
        }
        return true;
    }
}