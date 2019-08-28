const puppeteer = require('puppeteer-core');
const url = require('url')
//在启动本地浏览器前，先关闭已打开的浏览器，因为插件会操作浏览器系统gpu缓存文件，已打开的浏览器会造成文件被锁
  puppeteer.launch({
    executablePath : 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    slowMo : 50,
    headless :false,
    devtools:false,
    defaultViewport : null,
    userDataDir:'C:\\Users\\dell\\AppData\\Local\\Google\\Chrome\\User Data'
  }).then(async browse => {
    const page = await browse.pages().then(pages => pages[0])
    // page.on('response',res =>{
    //     const href = url.parse(res.url()).href;
    //     console.log(href)
    //     if(['https://api.geetest.com/get.php','https://api.geetest.com/refresh.php'].includes(href)){
    //         console.log(res.json())
    //     }
    // })
    await page.goto('https://www.qdfuns.com/portal.php') //该网站已经注销了，懵
    await page.waitFor(500)
    await page.click('.hand[data-type=login]')
    await page.type('#login_username_22e99d47','123')
    await page.waitFor(1000)
    await page.type('#login_password_22e99d47','123')
    await page.waitFor(1000)
    await page.click('.geetest_wind')
    await page.waitFor(1000)
    await page.waitForSelector('.geetest_fullpage_click')
    //开始验证码
    start(page)

  })

 /**
  * 计算按钮需要滑动的距离 
  * */ 
 async function calculateDistance(page) {
    const distance = await page.evaluate(() => {
  
      // 比较像素,找到缺口的大概位置
      function compare(document) {
        const ctx1 = document.querySelector('.geetest_canvas_fullbg'); // 完成图片
        const ctx2 = document.querySelector('.geetest_canvas_bg');  // 带缺口图片
        const pixelDifference = 40; // 像素差
        let res = []; // 保存像素差较大的x坐标
  
        // 对比像素
        for(let i=57;i<260;i++){
          for(let j=1;j<160;j++) {
            const imgData1 = ctx1.getContext("2d").getImageData(1*i,1*j,1,1)
            const imgData2 = ctx2.getContext("2d").getImageData(1*i,1*j,1,1)
            const data1 = imgData1.data;
            const data2 = imgData2.data;
            const res1=Math.abs(data1[0]-data2[0]);
            const res2=Math.abs(data1[1]-data2[1]);
            const res3=Math.abs(data1[2]-data2[2]);
                if(!(res1 < pixelDifference && res2 < pixelDifference && res3 < pixelDifference)) {
                  if(!res.includes(i)) {
                    res.push(i);
                  }
                }  
          }
        }
        // 返回像素差最大值跟最小值，经过调试最小值往左小7像素，最大值往左54像素
        return {min:res[0]-7,max:res[res.length-1]-51}
      }
      return compare(document)
    })
    return distance;
   }

    /**
  * 计算滑块位置
 */
 async function getBtnPosition(page) {
    const btn_position = await page.evaluate(() => {
      const btn = document.querySelector('.geetest_slider_button')
      const rect = btn.getBoundingClientRect();
      return {btn_left:rect.left+btn.clientWidth/2,btn_top:rect.top + btn.clientHeight/2}
    })
    return btn_position;
}

 /**
  * 尝试滑动按钮
  * @param distance 滑动距离
  * */  
 async function tryValidation(page,distance) {
    let btn_position = await getBtnPosition(page);
    //将距离拆分成两段，模拟正常人的行为
    const distance1 = distance - 10
    const distance2 = 10
  
    await page.mouse.move(btn_position.btn_left,btn_position.btn_top)
    await page.mouse.down()
    for(let d of move_trace(distance1)){
      await page.mouse.move(btn_position.btn_left+d,btn_position.btn_top,{steps:5})
    }
    await page.mouse.move(btn_position.btn_left+distance,btn_position.btn_top,{steps:10})
    await page.mouse.up()
    
    // 判断是否验证成功
    await page.waitFor(2000);
    const isSuccess = await page.evaluate(() => {
      return document.querySelector('.geetest_success_radar_tip_content') && document.querySelector('.geetest_success_radar_tip_content').innerHTML == '验证成功'
    })
    // 判断是否需要重新计算距离
    const reDistance = await page.evaluate(() => {
      return document.querySelector('.geetest_result_content') && document.querySelector('.geetest_result_content').innerHTML
    })
    return {isSuccess,reDistance:reDistance.includes('怪物吃了拼图')}
   }


    /**
  * 拖动滑块
  * @param distance 滑动距离
  * */ 
 async function start(page,distance) {
  distance = distance || await calculateDistance(page);
  const result = await tryValidation(page,distance.min)
  console.log(result)
  if(result.isSuccess) {
    await page.waitFor(1000);
    //登录
    console.log('验证成功')
    // page.click('#modal-member-login button')
  }else if(result.reDistance) {
    console.log('重新计算滑距离录，重新滑动')
    await page.waitFor(2000);
    await start(page)
  } else {
    if(distance.max - distance.min > 8){
      console.log('左侧有干扰，使用右侧距离')
      await start(page,{min:distance.max})
    }else{
      console.log('验证失败或者需要手动微调凹槽距离')
    }
  }
 }

 //模拟人移动速度，慢慢减速
 function* move_trace(distance){
    let t = 0;
    let s = 0;
    let a = 20;

    while(s <= distance){
      yield s = 150*t - 1/2*a*t*t;
      t += 0.2;
    }
 }


