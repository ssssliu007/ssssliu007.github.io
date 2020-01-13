'use strict'
const r = {
  calc(str0 = 1, str1, rule) {
    let min, max;
    if (str1 === undefined) {
      min = 0
      max = str0
    } else {
      min = str0
      max = str1
    }
    return rule(Math.random() * (max - min) + min)
  },
  int(str0 = 1, str1) {
    return this.calc(str0, str1, parseInt)
  },
  float(str0 = 1, str1) {
    return this.calc(str0, str1, parseFloat)
  }
}

class Game2048 {
  constructor(el, opts = {}) {
    if (typeof opts == "number") {
      opts = {
        spec: opts,
        historyLength: 3
      }
    } else {

    }
    this._global = {}
    this.addList = []
    this.historyList = []
    this.renewHistory(true)
    this._options = opts = Object.assign({
      spec: 4,
      stepPower: 2
    }, opts)
    this._map = {}
    this.$onchange = null
    this.onAnimate = false
    this._bookingList = new Map()
    if (typeof el == 'string') {
      el = document.querySelector(el)
    }
    this._el = el
    this.subscribe(this._options, '_options', 'animation_duration', (newValue, tDom, tName) => {
      tDom.setAttribute(tName,'transition-duration:'+newValue+'ms')
    }, el, 'style')
    this._options.animation_duration = 300
    this.initTouch()
    for (let y = 0; y < opts.spec; y++) {
      for (let x = 0; x < opts.spec; x++) {
        let key = `${x}_${y}`;
        this._map[key] = {
          value: '',
          baceClass: 'cell',
          class: '',
          animate: '',
          isMerged: false
        };
        el.appendChild([
          [
            [{
              attrName: 'class',
              value: 'cell-wrap cell-back'
            }]
          ],
          [
            [{
              attrName: 'class',
              value: 'cell-box'
            },{
              attrName: 'style',
              target: this._map[key],
              targetName: '_map_' + key,
              key: 'animate',
            }]
          ],
          [
            [{
              attrName: 'class',
              target: this._map[key],
              targetName: '_map_' + key,
              key: 'value',
              value: (v) =>  [this._map[key].baceClass, this._map[key].class, 'lv_'+ v].filter(_=>_).join(' ')
            },{
              attrName: 'class',
              target: this._map[key],
              targetName: '_map_' + key,
              key: 'class',
              value: (v) => [this._map[key].baceClass, v, 'lv_'+ this._map[key].value].filter(_=>_).join(' ')
            }], 'li'
          ]
        ].reduce((dom, cell) => {
          let cellDom = this.dom(...cell)
          cellDom.appendChild(dom)
          return cellDom
        }, this.dom([{
            attrName: 'innerText',
            target: this._map[key],
            targetName: '_map_' + key,
            key: 'value',
            value:(v)=>Math.pow(this._options.stepPower, v)
          },
          {
            attrName: 'class',
            value: 'cell-inner'
          }
        ])))
        this._set(this._map[key], 'value', 0)
        this._set(this._map[key], 'class', '')
        this._set(this._map[key], 'animate', '')
      }
    }
    this.init(this.historyList[0] && Object.entries(this.historyList[0].map).map(([k, v])=>[...k.split('_'), v]) || 4)
    setTimeout(() => {
      this._global.max = Object.entries(this._map).reduce((p,[k,{value: v}])=>v>p?v:p, 0) // 统计最大最小值
    }, 0);
    // this.init([
    //   [0, 0, 1],
    //   [1, 0, 1],
    //   [2, 0, 1],
    //   [3, 0, 2],
    // ])
    // this.init([
    //   [0, 0, 17],
    //   [1, 0, 18],
    //   [2, 0, 19],
    //   [3, 0, 20],
    //   [0, 1, 5],
    //   [1, 1, 6],
    //   [2, 1, 7],
    //   [3, 1, 8],
    //   [0, 2, 9],
    //   [1, 2, 10],
    //   [2, 2, 11],
    //   [3, 2, 12],
    //   [0, 3, 1],
    //   [1, 3, 2],
    //   [2, 3, 1],
    // ])
    this.done = new Promise((a)=>{
      setTimeout(() => {
        a()
      }, 0);
    })
  }
  reNew(){
    this.historyList = [];
    Object.keys(this._map).forEach(key=>{
      this._map[key].value = 0;
      this._map[key].class = ''
    })
    this.init()
  }
  init(init = 4) {
    if (init instanceof Array) {
      init.map(([x, y, v]) => {
        // this._set(this._map[x+'_'+y], 'value', v)
        this._map[x + '_' + y].value = v
        this._map[x + '_' + y].class = v && 'is-new' || ''
        // this._map[x+'_'+y] = {
        //   value: v,
        //   animate: ''
        // }
      })
    } else {
      let count = 99999
      do {
        count--
        let key = [0, 0].map(_ => r.int(this._options.spec)).join('_')
        if (!this._map[key].value) {
          this._map[key].value = r.int(1, 3)
          this._map[key].class = 'is-new'
          init--
        }
        if(count==0){
          console.error('max called')
        }
      } while (count>0 && init > 0)
    }
  }
  initTouch(){
    let opts = {
      moveFlag: false,
      startSet:{},
    };
    this._touchInfo = opts
    this._el.addEventListener("mousedown", (e)=> {
      Object.assign(this._touchInfo,{
        moveFlag: true,
        startSet:{x:e.clientX, y:e.clientY}
      })
		}, false);
		this._el.addEventListener("mousemove", this.tMove, false);
		this._el.addEventListener("mouseup", ()=> {
			this._touchInfo.moveFlag = false;
		}, false);
		this._el.addEventListener("touchstart", ({touches:[e]})=> {
			Object.assign(this._touchInfo,{
        moveFlag: true,
        startSet:{x:e.clientX, y:e.clientY}
      })
		}, false);
		this._el.addEventListener("touchmove", (e)=>{
      this.tMove(e.touches[0])
      e.preventDefault();
    }, false);
		this._el.addEventListener("touchup", ()=> {
      this._touchInfo.moveFlag = false;
    }, false);


  }
  tMove(e){
    if (this._touchInfo.moveFlag) {
      let {clientX: x, clientY: y}= e;
      x = this._touchInfo.startSet.x - x;
      y = this._touchInfo.startSet.y - y;
      if (Math.abs(x) > 100 || Math.abs(y) > 100) {
        if (Math.abs(x) > Math.abs(y)) {
          if (x > 0) {
            this.move(4);
          } else {
            this.move(2)
          }
        } else {
          if (y > 0) {
            this.move(1)
          } else {
            this.move(3)
          }
        }
        this._touchInfo.moveFlag = false
      }
    }
  }
  add(isX, isRise, type){
    let axis = Number(!!isX), {wtNo, weight} = this.addfuction(isRise, axis);
    let total = 0,
    isHaveToCheckLose = true,
    empty = Object.entries(this._map).reduce((c, [key, val])=>{
      if(!val.value){
        let tWeight = parseInt(weight(key, wtNo))
        total += tWeight
        c[key] = tWeight
      }
      return c
    }, {});
    if(this.addList[0]){
      let lo = this.addList.shift();
      if(lo.isX == isX && lo.isRise == isRise){
        this.historyList[0].addInfo = lo
        this.init([lo.keyToAdd])
        return false
      }else{
        this.addList = []
      }
    }
    if(total>0){
      let keyToAdd, randomPick = r.float(0, total), emptyArr = Object.entries(empty);
      isHaveToCheckLose = !emptyArr[1]
      for(let [k,v] of emptyArr){
        randomPick -= v;
        if(randomPick <= 0){
          keyToAdd = [...k.split('_'), r.int(1, 2)]
          break
        }
      }
      this.historyList[0].addInfo = {isX, isRise, keyToAdd, type}
      this.init([keyToAdd])
    }
    return isHaveToCheckLose
  }
  addfuction(isRise, axis){
    let wtNo = ((isRise)=>{
      return isRise ? (i)=>this._options.spec-i:(i)=>i+1
    })(isRise)
    return{
      wtNo,
      weight(key, wtNo){
        let xy = key.split('_');
        let nAxis = axis
        return wtNo(xy[nAxis])
      }
    }
  }
  move(type, isCheckOnly) {
  // 上右下左 1234 上左 正序；下右 倒叙
    if(!isCheckOnly && this.onAnimate){
      return
    }
    this.onAnimate = true
    let list = Object.entries(this._map),
      isX = type == 1 || type == 3,
      isRise = type == 2 || type == 3;
    if (type == 2 || type == 3) {
      list = list.reverse()
    }
    let animateList = [],
      mapToChange = JSON.parse(JSON.stringify(this._map));
    list.forEach(([i, v]) => {
      let animate = this.moveCell(i.split('_'), isX, isRise, mapToChange)
      if(animate){
        animateList.push(animate)
        if(isCheckOnly){ return}
        let value = this._map[animate.from.join('_')].value;
        this._map[animate.from.join('_')].class = animate.isAdd ? 'is-up lv_'+ (value+1) : ''
        this._map[animate.from.join('_')].animate = [
          (animate.isAdd ?'animation-delay:'+this._options.animation_duration*1+'ms':''),
          `transform: translate${isX?'Y':'X'}(${(isRise?1:-1) * animate.moved*100}%)`,
          `z-index:${value * 100 + animate.moved+1};`
        ].filter(_=>_).join(';');
      }
    })
    if(isCheckOnly){
      return !!animateList[0]
    }
    if(animateList[0]){
      this.historyList.unshift({
        animate: animateList,
      })
      this.historyList[this._options.historyLength - 1] && this.historyList.pop()
      setTimeout(() => {
        animateList.forEach((i) => {
          let value = this._map[i.from.join('_')].value;
          this._map[i.from.join('_')].value = 0
          this._map[i.from.join('_')].animate = 'transition-duration: 0ms;'
          this._map[i.to.join('_')].value = i.isAdd ? value + 1 : value
          this._map[i.from.join('_')].class = ''
          setTimeout(() => {
            this._map[i.from.join('_')].animate = ''
          }, 100);
        })
        let isHaveToCheckLose = this.add(isX, isRise, type);
        if(isHaveToCheckLose){
          let [a1, a2] = [this.move(1, true),this.move(2, true)]
          console.warn('x:',a2,'y:',a1)
          if(!this.move(1, true) && !this.move(2, true)){
            this.showModle('lose',{a1,a2})
          }
        }
        setTimeout(() => {
          this.onAnimate = false
          let thisMap = {}
          Object.entries(this._map).reduce((m, [k,v])=>{m[k] = v.value; return m}, thisMap)
          this.historyList[0].map = thisMap
          this.renewHistory()
          this.$onchange && this.$onchange(this.historyList[0], this._global)
        }, 100);
      }, this._options.animation_duration + 200);
    }else if(!isCheckOnly){
      this._el.classList.add('is-error')
      // this.onAnimate = true
      console.info('none Done')
      setTimeout(() => {
        this._el.classList.remove('is-error')
      }, 150);
      this.onAnimate = false
    }
    this._global.max = Object.entries(this._map).reduce((p,[k,{value: v}])=>v>p?v:p, 0) // 统计最大最小值
  }
  moveBackworld(){
    if(this.historyList[0]){
      let {animate: animateList,addInfo:{isX, isRise, keyToAdd, type}} = this.historyList.shift(),
      addMap = {},
      toReNew = true,
      newKey = keyToAdd[0]+'_'+keyToAdd[1],
      lastMap = JSON.parse(JSON.stringify(this._map));
      this.addList.unshift({isX, isRise, keyToAdd, type})
      this._map[newKey].class = 'is-gone'
      this.onAnimate = true
      animateList = animateList.reverse()
      animateList.forEach(i=>{
        let value = lastMap[i.to.join('_')].value;
        // this._map[i.from.join('_')].class = i.isAdd ? 'is-up lv_'+ (value+1) : ''
        i.thisValue = value
        i.isAdd && (addMap[i.to.join('_')] = true)
        this._map[i.from.join('_')].value = value;
        this._map[i.from.join('_')].animate = [
          'transition-duration: 0ms',
          // (i.isAdd ?'animation-delay:'+this._options.animation_duration*1+'ms':''),
          `transform: translate${isX?'Y':'X'}(${(isRise?1:-1) * i.moved*100}%)`,
          `z-index:${value * 100 + i.moved+1}`
        ].filter(_=>_).join(';');
        // console.log(
        //   'last', i.to.map(i=>parseInt(i)+1).join('_'),
        //   'now', i.from.map(i=>parseInt(i)+1).join('_'),
        //   this._map[i.from.join('_')].animate, i)
        if(newKey === i.from.join('_') || newKey === i.to.join('_')){
          toReNew = false
        }
      })
      setTimeout((toReNew) => {
        this._map[newKey].class = ''
        toReNew && (this._map[newKey].value = 0);
        animateList.forEach((i) => {
          let value = i.thisValue;
          if(i.isAdd || addMap[i.to.join('_')]){
            // console.log(i, i.to, i.from)
            this._map[i.to.join('_')].value = i.isAdd ? value - 1 : 0
            this._map[i.from.join('_')].value = value - 1
          }else{
            this._map[i.from.join('_')].value = value
            this._map[i.to.join('_')].value = 0
          }
          // if(i.isAdd){
          // }else{
          //   this._map[i.from.join('_')].value = 0
          // }
          // this._map[i.from.join('_')].animate = `z-index:${value * 100 + i.moved+1}`
          this._map[i.from.join('_')].animate = ''
          this._map[i.from.join('_')].class = ''
          this._map[i.to.join('_')].class = ''
          // setTimeout(() => {
          //   this._map[i.from.join('_')].animate = ''
          // }, 100);
        })
        setTimeout(() => {
          this.onAnimate = false
          let thisMap = {}
          Object.entries(this._map).reduce((m, [k,v])=>{m[k] = v.value; return m}, thisMap)
          this.renewHistory()
          this.$onchange && this.$onchange(this.historyList[0], this._global)
        }, 100);
      }, this._options.animation_duration + 200, toReNew);
      this._global.max = Object.entries(this._map).reduce((p,[k,{value: v}])=>v>p?v:p, 0) // 统计最大最小值
    }
  }
  moveCell(xy, isX, isRise, map) { // type 横0 竖1
    xy = xy.map(_ => parseInt(_))
    let coor = Number(isX),
      toMove = xy[coor],
      endIndex = isRise ? this._options.spec - 1 : 0,
      value = Number(map[xy.join('_')].value),
      moved = 0,
      dirc = (isRise ? 1 : -1),
      oXy = Array.from(xy);
    if (toMove == endIndex || value <= 0) {
      return false
    } else {
      for (let k = 0, len = dirc * (endIndex - toMove); k < len; k++) {
        let tXy = Array.from(xy);
        xy[coor] += dirc;
        let tValue = map[xy.join('_')].value,
        isMerged = map[xy.join('_')].isMerged;
        if ((tValue == value) && !isMerged) {
          map[oXy.join('_')].value = 0
          map[xy.join('_')].value = value * 2
          map[xy.join('_')].isMerged = true
          moved++
          return {
            from: oXy,
            to: xy,
            moved,
            isAdd: true
          }
        } else if (tValue == 0) {
          moved++
        } else if (tValue != value || (tValue == value && isMerged)) {
          map[oXy.join('_')].value = 0
          map[tXy.join('_')].value = value
          return moved && {
            from: oXy,
            to: tXy,
            moved,
            isAdd: false
          } || false
        }
      }
      map[oXy.join('_')].value = 0
      map[xy.join('_')].value = value
      return {
        from: oXy,
        to: xy,
        moved,
        isAdd: false
      }
    }
  }
  renewHistory(isInit){
    if(isInit){
      let storage = window.localStorage.getItem('history_list')||[]
      try{
        storage = JSON.parse(storage)
      }catch(e){
        storage = []
      }
      this.historyList = storage
    }else{
      window.localStorage.setItem('history_list', JSON.stringify(this.historyList))
    }
    setTimeout(() => {
      this._global.historyLength = this.historyList.length
    }, 0);
  }
  dom(attrs = [], tag = 'div') {
    let dom = document.createElement(tag)
    for (let {
        attrName,
        target,
        targetName,
        key,
        value
      } of attrs) {
      if (target && key) {
        this.subscribe(target, targetName, key, (newValue, tDom, tName) => {
          newValue = value ? value(newValue) : newValue
          if (tDom[tName] === undefined) {
            tDom.setAttribute(tName, newValue)
          } else {
            tDom[tName] = newValue
          }
        }, dom, attrName)
      } else {
        dom.setAttribute(attrName, value)
      }
    }
    return dom
  }
  showModle(name, opts){
    switch (name) {
      case 'lose':
        setTimeout(() => {
          alert('你挂了')
        }, 600);
        break;
      default:
        break;
    }
    console.warn(name, opts)
  }
  subscribe(target, targetName, key, callBack, ...params) {
    let valueValue = target[key],
      mapName = `${targetName}_${key}`,
      taskList = this._bookingList.get(mapName)
    if (taskList) {
      taskList.push([callBack, ...params])
      this._bookingList.set(taskList)
    } else {
      this._bookingList.set(mapName, [
        [callBack, ...params]
      ])
      Object.defineProperty(target, key, {
        set: function (e) {
          valueValue = e
          this._bookingList.get(mapName).forEach((value) => {
            let [cb, ...pas] = value;
            cb(e, ...pas)
          })
          return
        }.bind(this),
        get() {
          return valueValue
        }
      })
    }
  }
  _set(target, key, val) {
    if (Array.isArray(target) && isValidArrayIndex(key)) {
      target.length = Math.max(target.length, key)
      target.splice(key, 1, val)
      return val
    }
    if (key in target && !(key in Object.prototype)) {
      target[key] = val
      return val
    }
    const ob = target.__ob__
    if (target._isVue || (ob && ob.vmCount)) {
      process.env.NODE_ENV !== 'production' && warn(
        'Avoid adding reactive properties to a Vue instance or its root $data ' +
        'at runtime - declare it upfront in the data option.'
      )
      return val
    }
    if (!ob) {
      target[key] = val
      return val
    }
    defineReactive(ob.value, key, val)
    ob.dep.notify()
    return val
  }
}