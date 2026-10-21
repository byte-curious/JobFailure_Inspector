export class RingBuffer<T>{
    private items : (T | undefined)[];
    private next = 0;
    private count = 0;

    constructor(private readonly capacity : number){
        if(capacity <= 0 || !Number.isInteger(capacity)){
            throw new Error("Capacity must be a positive number")
        }
        this.items = new Array<T | undefined>(Math.min(capacity, 50));
    }

    push(item: T): void{
        this.items[this.next] = item;
        this.next = (this.next + 1)%this.capacity;
        this.count =  Math.min(this.count + 1, this.capacity)

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
    }
    get size(): number{
        return this.count
    }
}
