import role from './role'
import { roomConfig } from './config'

export default function () {
    extendRoomProperties()
    _.assign(Room.prototype, RoomExtension.prototype)
}

class RoomExtension extends Room {
    doWork(): string | number {
        this.check()
        this.work()
        this.tick()
        if(this.status.logging){
            this.showLog()
        }
        return OK
    }
    work(): void {
        // Scan
        if(this.signal["scanStructures"] == 0){
            this.scanStructures()
        }
        if(this.signal["scanTasks"] == 0){
            this.scanTasks()
        }
        // Structure doWork
        for(const type in this.structures){
            for(const structure of this.structures[type]){
                structure.doWork()
            }
        }
        // Creep doWork
        for(const roleName in this.staff){
            for(const name of this.staff[roleName]){
                if(Game.creeps[name]){
                    Game.creeps[name].doWork()
                }else{
                    if(!Memory.creeps[name] || (Memory.creeps[name].status.active && !Memory.creeps[name].status.spawning)){
                        this.spawns[0].newTask(roleName, name)
                        Memory.creeps[name].status.spawning = true
                    }
                }
            }
        }
    }
    check() {
        // Check Memory
        this.status
        this.structures
        this.spawns
        this.sources
        this.staff
        this.tasks
        this.signal
        // Check Staff
        if(this.spawns[0].tasks.length == 0){
            if(this.tasks["Builder"].length > 0 && this.staff["Builder"].length < 3){
                this.moreStaff("Builder")
            }
        }
    }
    init() {

    }
    tick() {
        for(const item in this.signal){
            if(this.memory.signal[item] > 0){
                this.memory.signal[item] -= 1
            }else{
                this.memory.signal[item] = roomConfig.signal[item]
            }
        }
    }
    showLog() {
        if(!this.logs || this.logs.length == 0){
            return
        }
        for(const log of this.logs){
            console.log(log)
        }
        this.memory.logs = []
    }
    addLog(log: string){
        if(this.logs){
            this.memory.logs.push(log)
        }
    }
    moreStaff(role: string) {
        let name = [this.name,role,this.staff[role].length+1].join('_')
        this.memory.staff[role].push(name)
        this.spawns[0].newTask(role,name)
    }
    lessStaff(role: string) {
        let name = this.memory.staff[role].pop()
        Game.creeps[name].suicide()
        delete Memory.creeps[name]
    }
    clear() {
        delete this.memory
    }
    scanStructures() {
        this.memory.structureIds = {}
        let structures = this.find(FIND_MY_STRUCTURES)
        for(let structure of structures){
            if(!this.memory.structureIds[structure.structureType]){
                this.memory.structureIds[structure.structureType]=[structure.id]
            }else{
                this.memory.structureIds[structure.structureType].push(structure.id)
            }
        }
    }
    scanStaff() {
        this.memory.staff = {}
        let creeps = this.find(FIND_MY_CREEPS)
        for(const creep of creeps){
            if(!this.memory.staff[creep.memory.role]){
                this.memory.staff[creep.memory.role] = [creep.name]
            }else{
                this.memory.staff[creep.memory.role].push(creep.name)
            }
        }
    }
    scanTasks() {
        this.memory.tasks = {}
        for(const type in this.structures){
            for(const structure of this.structures[type]){
                if(structure.store && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0){
                    if(roomConfig.taskPriority["Transfer"][structure.structureType]){
                        this.newTask("Transfer", roomConfig.taskPriority["Transfer"][structure.structureType])
                    }
                    if(roomConfig.taskPriority["Harvester"][structure.structureType]){
                        this.newTask("Harvester", roomConfig.taskPriority["Harvester"][structure.structureType])
                    }
                }
                if(structure.hits < structure.hitsMax){
                    if(roomConfig.taskPriority["Repairer"][structure.structureType]){
                        this.newTask("Repairer", roomConfig.taskPriority["Repairer"][structure.structureType])
                    }
                }
            }
        }
        let sites = this.find(FIND_MY_CONSTRUCTION_SITES)
        this.memory.tasks["Builder"] = sites.map(site => { return {"id": site.id }})
    }
    newTask(role:string, id:string, priority?:number) {
        let task = {
            id: id,
            priority: priority
        }
        if(!task.priority){
            task.priority = 5
        }
        if(!this.memory.tasks[role]){
            this.memory.tasks[role] = [task]
        }else{
            this.memory.tasks[role].push(task)
        }
    }
    getTask(role:string){
        if(this.tasks && this.tasks[role].length > 0){
            let task = this.tasks[role].pop()
            this.memory.tasks[role].push(task)
            return task.id
        }
        return
    }
}

let extendRoomProperties = function() {
    Object.defineProperties(Room.prototype, {
        "sources": {
            get: function() {
                if(!this._sources) {
                    if(!this.memory.sourceIds){
                        this.memory.sourceIds = this.find(FIND_SOURCES).map(s=>s.id);
                    }
                    this._sources = this.memory.sourceIds.map(id => Game.getObjectById(id))
                }
                return this._sources;
            },
            enumerable: false,
            configurable: true
        },
        "spawns": {
            get: function () {
                if(!this._spawns) {
                    if(!this.memory.structureIds[STRUCTURE_SPAWN]){
                        this.scanStructures()
                    }
                    this._spawns = this.memory.structureIds[STRUCTURE_SPAWN].map(id => Game.getObjectById(id))
                }
                return this._spawns
            },
            enumerable: false,
            configurable: true
        },
        "tasks": {
            get: function() {
                if(!this.memory.tasks){
                    this.memory.tasks = {}
                    for(const roleName in role){
                        this.memory.tasks[roleName] = []
                    }
                }
                return this.memory.tasks
            },
            enumerable: false,
            configurable: true
        },
        "staff": {
            get: function() {
                if(!this.memory.staff){
                    this.memory.staff = {}
                    for(const roleName in role){
                        this.memory.staff[roleName] = []
                    }
                }
                return this.memory.staff
            },
            enumerable: false,
            configurable: true
        },
        "structures": {
            get: function() {
                if(!this._structures){
                    if(!this.memory.structureIds){
                        this.memory.structureIds = {}
                        const structureTypes = [
                            STRUCTURE_SPAWN,STRUCTURE_EXTENSION,STRUCTURE_CONTAINER,
                            STRUCTURE_STORAGE,STRUCTURE_TOWER,STRUCTURE_LAB,STRUCTURE_CONTROLLER,
                            STRUCTURE_FACTORY,STRUCTURE_EXTRACTOR,STRUCTURE_LINK,STRUCTURE_NUKER,
                            STRUCTURE_OBSERVER
                        ]
                        for(const structureType of structureTypes){
                            this.memory.structureIds[structureType] = []
                        }
                    }
                    this._structures = _.mapValues(this.memory.structureIds,(structureList) => {
                        return structureList.map(id => Game.getObjectById(id))
                    })
                }
                return this._structures
            },
            enumerable: false,
            configurable: true
        },
        "status": {
            get: function() {
                if(!this.memory.status){
                    this.memory.status = roomConfig.status
                }
                return this.memory.status
            },
            enumerable: false,
            configurable: true
        },
        "signal": {
            get: function() {
                if(!this.memory.signal){
                    this.memory.signal = roomConfig.signal
                }
                return this.memory.signal
            },
            enumerable: false,
            configurable: true
        },
        "logs": {
            get: function() {
                if(!this.memory.logs){
                    this.memory.logs = []
                }
                return this.memory.logs
            },
            enumerable: false,
            configurable: true
        }
    });
}