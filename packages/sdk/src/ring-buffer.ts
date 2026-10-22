export class RingBuffer<T>{
    private items : (T | undefined)[];
    private next = 0;
    // count tracking how many items are added in the circular queue of max size 50
    // if count exceed over 50 it become constant to 50
    private count = 0;
    // it tracks total items pushed, so that we get the correct index of the items even
    // after dropping element
    private totalPushes = 0;

    constructor(private readonly capacity : number= 50){
        if(capacity <= 0 || !Number.isInteger(capacity)){
            throw new Error("Capacity must be a positive integer")
        }
        this.items = new Array<T | undefined>(Math.min(capacity));
    }

    push(item: T): void{
        this.items[this.next] = item;
        this.next = (this.next + 1)%this.capacity;
        this.count =  Math.min(this.count + 1, this.capacity)
        this.totalPushes++;

    }
    toArray(): T[]{

        if(this.capacity > this.count){
            return this.items.slice(0, Number(this.count)) as T[];
        }

        const result : T[] = new Array(this.capacity);

        for(let i = 0; i < this.capacity; i++){
            const idx = (this.next + i)%this.capacity;
            result[i] = this.items[idx] as T
        }
        return result;
    }
    clear():void{
        this.next = 0;
        this.count = 0;
        this.items =  [];
        this.totalPushes = 0;
    }
    get size(): number{
        return this.count
    }
    get droppedCount(): number{
        return Math.max(0, this.totalPushes - this.count)
    }
}
