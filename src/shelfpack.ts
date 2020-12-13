export default class ShelfPack {
    w: any;
    h: any;
    autoResize: boolean;
    shelves: Shelf[];
    freebins: Bin[];
    stats: any;
    bins: any;
    maxId: number;


    /**
     * Create a new ShelfPack bin allocator.
     *
     * Uses the Shelf Best Height Fit algorithm from
     * http://clb.demon.fi/files/RectangleBinPack.pdf
     *
     * @class  ShelfPack
     * @param  {number}  [w=64]  Initial width of the sprite
     * @param  {number}  [h=64]  Initial width of the sprite
     * @param  {Object}  [options]
     * @param  {boolean} [options.autoResize=false]  If `true`, the sprite will automatically grow
     * @example
     * var sprite = new ShelfPack(64, 64, { autoResize: false });
     */
    constructor(w: number, h: number, options?: any) {
        options = options || {};
        this.w = w || 64;
        this.h = h || 64;
        this.autoResize = !!options.autoResize;
        this.shelves = [];
        this.freebins = [];
        this.stats = {};
        this.bins = [];
        this.maxId = 0;
    }


    /**
     * Batch pack multiple bins into the sprite.
     *
     * @param   {Object[]} bins       Array of requested bins - each object should have `width`, `height` (or `w`, `h`) properties
     * @param   {number}   bins[].w   Requested bin width
     * @param   {number}   bins[].h   Requested bin height
     * @param   {Object}   [options]
     * @param   {boolean}  [options.inPlace=false] If `true`, the supplied bin objects will be updated inplace with `x` and `y` properties
     * @returns {Bin[]}    Array of allocated Bins - each Bin is an object with `id`, `x`, `y`, `w`, `h` properties
     * @example
     * var bins = [
     *     { id: 1, w: 12, h: 12 },
     *     { id: 2, w: 12, h: 16 },
     *     { id: 3, w: 12, h: 24 }
     * ];
     * var results = sprite.pack(bins, { inPlace: false });
     */
    pack(bins: Bin[], options: any) {
        this.bins = [...(bins)];
        options = options || {};

        var results = [],
            w, h, id, allocation;

        for (var i = 0; i < bins.length; i++) {
            w = bins[i].w;
            h = bins[i].h;
            id = bins[i].id;

            if (w && h) {
                allocation = this.packOne(w, h, id);
                if (!allocation) {
                    continue;
                }
                if (options.inPlace) {
                    bins[i].x = allocation.x;
                    bins[i].y = allocation.y;
                    bins[i].id = allocation.id;
                }
                results.push(allocation);
            }
        }

        this.shrink();

        return results;
    };


    /**
     * Pack a single bin into the sprite.
     *
     * Each bin will have a unique identitifer.
     * If no identifier is supplied in the `id` parameter, one will be created.
     * Note: The supplied `id` is used as an object index, so numeric values are fastest!
     *
     * Bins are automatically refcounted (i.e. a newly packed Bin will have a refcount of 1).
     * When a bin is no longer needed, use the `ShelfPack.unref` function to mark it
     *   as unused.  When a Bin's refcount decrements to 0, the Bin will be marked
     *   as free and its space may be reused by the packing code.
     *
     * @param    {number}         w      Width of the bin to allocate
     * @param    {number}         h      Height of the bin to allocate
     * @param    {number|string}  [id]   Unique identifier for this bin, (if unsupplied, assume it's a new bin and create an id)
     * @returns  {Bin}            Bin object with `id`, `x`, `y`, `w`, `h` properties, or `null` if allocation failed
     * @example
     * var results = sprite.packOne(12, 16, 'a');
     */
    packOne(w: number, h: number, id?: number | string): Bin | null {
        var best = { freebin: -1, shelf: -1, waste: Infinity },
            y = 0,
            bin, shelf, waste, i;

        // if id was supplied, attempt a lookup..
        if (typeof id === 'string' || typeof id === 'number') {
            bin = this.getBin(id);
            if (bin) {              // we packed this bin already
                this.ref(bin);
                return bin;
            }
            if (typeof id === 'number') {
                this.maxId = Math.max(id, this.maxId);
            }
        } else {
            id = ++this.maxId;
        }

        // First try to reuse a free bin..
        for (i = 0; i < this.freebins.length; i++) {
            bin = this.freebins[i];

            // exactly the right height and width, use it..
            if (h === bin.maxh && w === bin.maxw) {
                return this.allocFreebin(i, w, h, id);
            }
            // not enough height or width, skip it..
            if (h > bin.maxh || w > bin.maxw) {
                continue;
            }
            // extra height or width, minimize wasted area..
            if (h <= bin.maxh && w <= bin.maxw) {
                waste = (bin.maxw * bin.maxh) - (w * h);
                if (waste < best.waste) {
                    best.waste = waste;
                    best.freebin = i;
                }
            }
        }

        // Next find the best shelf..
        for (i = 0; i < this.shelves.length; i++) {
            shelf = this.shelves[i];
            y += shelf.h;

            // not enough width on this shelf, skip it..
            if (w > shelf.free) {
                continue;
            }
            // exactly the right height, pack it..
            if (h === shelf.h) {
                return this.allocShelf(i, w, h, id);
            }
            // not enough height, skip it..
            if (h > shelf.h) {
                continue;
            }
            // extra height, minimize wasted area..
            if (h < shelf.h) {
                waste = (shelf.h - h) * w;
                if (waste < best.waste) {
                    best.freebin = -1;
                    best.waste = waste;
                    best.shelf = i;
                }
            }
        }

        if (best.freebin !== -1) {
            return this.allocFreebin(best.freebin, w, h, id);
        }

        if (best.shelf !== -1) {
            return this.allocShelf(best.shelf, w, h, id);
        }

        // No free bins or shelves.. add shelf..
        if (h <= (this.h - y) && w <= this.w) {
            shelf = new Shelf(y, this.w, h);
            return this.allocShelf(this.shelves.push(shelf) - 1, w, h, id);
        }

        // No room for more shelves..
        // If `autoResize` option is set, grow the sprite as follows:
        //  * double whichever sprite dimension is smaller (`w1` or `h1`)
        //  * if sprite dimensions are equal, grow width before height
        //  * accomodate very large bin requests (big `w` or `h`)
        if (this.autoResize) {
            var h1, h2, w1, w2;

            h1 = h2 = this.h;
            w1 = w2 = this.w;

            if (w1 <= h1 || w > w1) {   // grow width..
                w2 = Math.max(w, w1) * 2;
            }
            if (h1 < w1 || h > h1) {    // grow height..
                h2 = Math.max(h, h1) * 2;
            }

            this.resize(w2, h2);
            return this.packOne(w, h, id);  // retry
        }

        return null;
    };


    /**
     * Called by packOne() to allocate a bin by reusing an existing freebin
     *
     * @private
     * @param    {number}         index  Index into the `this.freebins` array
     * @param    {number}         w      Width of the bin to allocate
     * @param    {number}         h      Height of the bin to allocate
     * @param    {number|string}  id     Unique identifier for this bin
     * @returns  {Bin}            Bin object with `id`, `x`, `y`, `w`, `h` properties
     * @example
     * var bin = sprite.allocFreebin(0, 12, 16, 'a');
     */
    allocFreebin(index: number, w: number, h: number, id: number | string) {
        var bin = this.freebins.splice(index, 1)[0];
        bin.id = id;
        bin.w = w;
        bin.h = h;
        bin.refcount = 0;
        this.bins[id] = bin;
        this.ref(bin);
        return bin;
    };


    /**
     * Called by `packOne() to allocate bin on an existing shelf
     *
     * @private
     * @param    {number}         index  Index into the `this.shelves` array
     * @param    {number}         w      Width of the bin to allocate
     * @param    {number}         h      Height of the bin to allocate
     * @param    {number|string}  id     Unique identifier for this bin
     * @returns  {Bin}            Bin object with `id`, `x`, `y`, `w`, `h` properties
     * @example
     * var results = sprite.allocShelf(0, 12, 16, 'a');
     */
    allocShelf(index: number, w: number, h: number, id: number | string): Bin {
        var shelf = this.shelves[index];
        var bin = shelf.alloc(w, h, id);
        this.bins[id] = bin;
        if (bin) {
            this.ref(bin);
        } else {
            throw new Error('bin needs to exist')
        }
        if (bin)
            return bin;
        throw new Error('bin needs to exist')
    };


    /**
     * Shrink the width/height of the sprite to the bare minimum.
     * Since shelf-pack doubles first width, then height when running out of shelf space
     * this can result in fairly large unused space both in width and height if that happens
     * towards the end of bin packing.
     */
    shrink() {
        if (this.shelves.length > 0) {
            var w2 = 0;
            var h2 = 0;

            for (var j = 0; j < this.shelves.length; j++) {
                var shelf = this.shelves[j];
                h2 += shelf.h;
                w2 = Math.max(shelf.w - shelf.free, w2);
            }

            this.resize(w2, h2);
        }
    };


    /**
     * Return a packed bin given its id, or undefined if the id is not found
     *
     * @param    {number|string}  id  Unique identifier for this bin,
     * @returns  {Bin}            The requested bin, or undefined if not yet packed
     * @example
     * var b = sprite.getBin('a');
     */
    getBin(id: number | string) {
        return this.bins[id];
    };


    /**
     * Increment the ref count of a bin and update statistics.
     *
     * @param    {Bin}     bin  Bin instance
     * @returns  {number}  New refcount of the bin
     * @example
     * var bin = sprite.getBin('a');
     * sprite.ref(bin);
     */
    ref(bin: Bin): number {
        if (++bin.refcount === 1) {   // a new Bin.. record height in stats historgram..
            var h = bin.h;
            this.stats[h] = (this.stats[h] | 0) + 1;
        }

        return bin.refcount;
    };


    /**
     * Decrement the ref count of a bin and update statistics.
     * The bin will be automatically marked as free space once the refcount reaches 0.
     *
     * @param    {Bin}     bin  Bin instance
     * @returns  {number}  New refcount of the bin
     * @example
     * var bin = sprite.getBin('a');
     * sprite.unref(bin);
     */
    unref(bin: Bin): number {
        if (bin.refcount === 0) {
            return 0;
        }

        if (--bin.refcount === 0) {
            this.stats[bin.h]--;
            delete this.bins[bin.id];
            this.freebins.push(bin);
        }

        return bin.refcount;
    };


    /**
     * Clear the sprite.  Resets everything and resets statistics.
     *
     * @example
     * sprite.clear();
     */
    clear() {
        this.shelves = [];
        this.freebins = [];
        this.stats = {};
        this.bins = {};
        this.maxId = 0;
    };


    /**
     * Resize the sprite.
     *
     * @param   {number}  w  Requested new sprite width
     * @param   {number}  h  Requested new sprite height
     * @returns {boolean} `true` if resize succeeded, `false` if failed
     * @example
     * sprite.resize(256, 256);
     */
    resize(w: number, h: number): boolean {
        this.w = w;
        this.h = h;
        for (var i = 0; i < this.shelves.length; i++) {
            this.shelves[i].resize(w);
        }
        return true;
    };

}
export class Shelf {
    free: any;
    h: any;
    x: any;
    y: number;
    w: any;
    /**
     * Create a new Shelf.
     *
     * @private
     * @class  Shelf
     * @param  {number}  y   Top coordinate of the new shelf
     * @param  {number}  w   Width of the new shelf
     * @param  {number}  h   Height of the new shelf
     * @example
     * var shelf = new Shelf(64, 512, 24);
     */
    constructor(y: number, w: number, h: number) {
        this.x = 0;
        this.y = y;
        this.w = this.free = w;
        this.h = h;
    }


    /**
     * Allocate a single bin into the shelf.
     *
     * @private
     * @param   {number}         w   Width of the bin to allocate
     * @param   {number}         h   Height of the bin to allocate
     * @param   {number|string}  id  Unique id of the bin to allocate
     * @returns {Bin}            Bin object with `id`, `x`, `y`, `w`, `h` properties, or `null` if allocation failed
     * @example
     * shelf.alloc(12, 16, 'a');
     */
    alloc(w: number, h: number, id: number | string) {
        if (w > this.free || h > this.h) {
            return null;
        }
        var x = this.x;
        this.x += w;
        this.free -= w;
        return new Bin(id, x, this.y, w, h, w, this.h);
    };


    /**
     * Resize the shelf.
     *
     * @private
     * @param   {number}  w  Requested new width of the shelf
     * @returns {boolean}    true
     * @example
     * shelf.resize(512);
     */
    resize(w: number) {
        this.free += (w - this.w);
        this.w = w;
        return true;
    };


}

export class Bin {
    id: string | number;
    x: number;
    y: number;
    w: number;
    h: number;
    maxw: number;
    maxh: number;
    refcount: number;
    /**
     * Create a new Bin object.
     *
     * @class  Bin
     * @param  {number|string}  id      Unique id of the bin
     * @param  {number}         x       Left coordinate of the bin
     * @param  {number}         y       Top coordinate of the bin
     * @param  {number}         w       Width of the bin
     * @param  {number}         h       Height of the bin
     * @param  {number}         [maxw]  Max width of the bin (defaults to `w` if not provided)
     * @param  {number}         [maxh]  Max height of the bin (defaults to `h` if not provided)
     * @example
     * var bin = new Bin('a', 0, 0, 12, 16);
     */
    constructor(id: number | string, x: number, y: number, w: number, h: number, maxw: number, maxh: number) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.maxw = maxw || w;
        this.maxh = maxh || h;
        this.refcount = 0;
    }

}