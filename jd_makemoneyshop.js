/*
cron:0 0 0 * * *
原脚本 https://raw.githubusercontent.com/6dylan6/jdpro/main/jd_makemoneyshop.js
by、梦创星河 QQ1659670408
TY二次修改优化
updatetime: 2022/11/14
京东特价APP首页-赚钱大赢家
进APP看看，能不能进去，基本都黑的！！！
有的能进去，助力确是黑的！！每个人的助力码基本上是不变的。
运行流程：设置助力信息--是否过滤黑号--助力--领取任务奖励！！！
助力信息变量：多个助力信息用&隔开，助力信息里面包括用户名和助力码用:隔开。
用户名和助力码可都填也可以只填用户名，若只有用户名就去ck里面筛选助力信息获取助力码。
两个都有就不去获取更新，且设置不过滤黑号就直接开始直接助力了。
DYJ_shareInfo='用户名&用户名:助力码'
设置是否过滤黑号 true|false 默认不过滤黑号
DYJ_filter='false'
助力间隔时间单位是毫秒，可固定也可设置最小到最大的随机延时。也可为0
DYJ_HelpWait='最小毫秒-最大毫秒'
*/
//const Env=require('./utils/Env.js');
const $ = new Env('特价版大赢家');
const notify = $.isNode() ? require('./sendNotify') : '';
const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
//IOS等用户直接用NobyDa的jd cookie
const {UARAM,randomNumber} = require('./USER_AGENTS');
const fs = require('fs');
let black_path = './bigwinner_black.txt',black_user = [],cookiesArr = [],
need_invite=20,cookie = '',DYJ_filter=false,DYJ_HelpWait=[500,1500],
shareInfo = [],sharePins=[],helpinfo = {};
const Hour = (new Date()).getHours()
const query = Hour >= 9
const CryptoJS = require("crypto-js");
$.CryptoJS=CryptoJS

const moment = require("moment");

if (process.env.DYJ_shareInfo) {
    let t=process.env.DYJ_shareInfo.split("&");
    Object.keys(t).forEach((i) => {
        let a=t[i].split(":");
        sharePins.push(a[0]);
        shareInfo.push({pin:a[0],id:a.length>1?a[1]:''})
    })
    console.log(`已设置${shareInfo.length}个助力信息\n`);
}else{
    console.log(`请设置助力信息：DYJ_shareInfo='用户名&用户名:助力码'\n`);
}

if(process.env.DYJ_filter){
    DYJ_filter=process.env.DYJ_filter === 'true';
    console.log(`当前`+(DYJ_filter?"开启":"关闭")+`过滤黑号`);
}else{
    console.log(`请设置是否过滤黑号：DYJ_filter='true|false'
默认不过滤黑号\n`);
}

if(process.env.DYJ_HelpWait){
    DYJ_HelpWait=process.env.DYJ_HelpWait.split("-");
    DYJ_HelpWait[0]=parseInt(DYJ_HelpWait[0]);
    if(isNaN(DYJ_HelpWait[0])){
        DYJ_HelpWait[0]=500;
        console.log(`我真是无语了，你还是卸载青龙吧！`);
    }
    if(DYJ_HelpWait.length>1){
        DYJ_HelpWait[1]=parseInt(DYJ_HelpWait[1]);
        if(isNaN(DYJ_HelpWait[1])){
            DYJ_HelpWait[1]=1500;
            console.log(`我真是无语了，你还是卸载青龙吧！`);
        }
        console.log(`当前随机延时${DYJ_HelpWait[0]}-${DYJ_HelpWait[1]}Ms`);
    }else{
        console.log(`当前固定延时${DYJ_HelpWait[0]}Ms`);
    }
}else{
    console.log(`请设置助力间隔时间(毫秒)：DYJ_HelpWait='最小毫秒-最大毫秒'
也可固定，默认是500-1500毫秒，也就是0.5秒到1.5秒`);
}

let Fileexists = fs.existsSync(black_path);
if (Fileexists) {
    console.log(`检测到大赢家黑名单缓存数据${black_path}，载入...`);
    black_user = fs.readFileSync(black_path, 'utf-8');
    if (black_user) {
        black_user = black_user.toString().split("&");
        console.log(`检测到大赢家黑名单账号有${black_user.length}个`);
    }
}

if ($.isNode()) {
    Object.keys(jdCookieNode).forEach((item) => {
        cookiesArr.push(jdCookieNode[item])
    })
    if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => { };
} else {
    cookiesArr = [$.getdata('CookieJD'), $.getdata('CookieJD2'), ...jsonParse($.getdata('CookiesJD') || "[]").map(item => item.cookie)].filter(item => !!item);
}


function getDate(extra){
    var dat = new Date;//生成日期
    var year = dat.getFullYear();//取得年
    var month = dat.getMonth()+1;    //取得月,js从0开始取,所以+1
    var date1 = dat.getDate(); //取得天
    var hour = dat.getHours();//取得小时
    var minutes = dat.getMinutes();//取得分钟
    dat.getMilliseconds
    var second = dat.getSeconds();//取得秒
    var haomiao = dat.getMilliseconds();
    dat = undefined;
    //return year+"-"+month+"-"+date1+" "+hour+":"+minutes +":"+second+" "+haomiao + extra ;
    return (hour>9?'':'0')+hour+":"+(minutes>9?'':'0')+minutes +":"+(second>9?'':'0')+second+" "+haomiao.toString().padStart(3, '0') + extra ;
}

function log(){
    //-log
    process.stdout.write(getDate(': '));
    console.log.apply(console, arguments);
    //console.oldlog.apply(console, arguments);
}
console.oldlog = console.log;
console.time = log;


!(async () => {
    if (!cookiesArr[0]) {
        $.msg($.name, '【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/bean/signIndex.action', { "open-url": "https://bean.m.jd.com/bean/signIndex.action" });
        return;
    }
    
    for (let i = 0; i < cookiesArr.length; i++) {
        if (cookiesArr[i]) {
            cookie = cookiesArr[i];
            
            $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1])
            if(!$.UserName){
                console.log(`\n正则用户名失败！ck->${cookie}`);
                continue;
            }
            $.index = i + 1;
            $.isLogin = true;
            $.nickName = '';
            helpinfo[$.UserName] = {};
            UA = UARAM();
            helpinfo[$.UserName].ua = UA;
            let Pin_i=sharePins.indexOf($.UserName);
            if(DYJ_filter){
                if( black_user.length && black_user.includes($.UserName) && Pin_i==-1 ){
                    helpinfo[$.UserName].hot=1;
                    continue;
                } 
            }else if( Pin_i==-1 || (shareInfo[Pin_i].id && !query) ) continue;
            //await TotalBean();
            console.log(`\n******开始【京东`+(Pin_i!=-1?"车头":"")+`账号${$.index}】${$.nickName || $.UserName}*********`);
            if (!$.isLogin) {
                $.msg($.name, `【提示】cookie已失效`, `京东账号${$.index} ${$.nickName || $.UserName}\n请重新登录获取\nhttps://bean.m.jd.com/bean/signIndex.action`, { "open-url": "https://bean.m.jd.com/bean/signIndex.action" });
                if ($.isNode()) {
                    await notify.sendNotify(`${$.name}cookie已失效 - ${$.UserName}`, `京东账号${$.index} ${$.UserName}\n请重新登录获取cookie`);
                }
                continue
            }
            await getinfo(1,Pin_i);
            await $.wait(1000);
        }
    }
    let txt=''
    //shareInfo=[];
    if(shareInfo.length){
        console.log('\n检查是否存在空助力码.')
        for (let j = 0,l=shareInfo.length,uname; j < l; j++) {
            uname=sharePins[j];
            if( !shareInfo[j].id ){
                console.log('用户名：${uname} 助力码为空！');
                shareInfo.splice(j, 1);j--;
            }else txt+=uname+':'+shareInfo[j].id+'&';
        }
    }
    if (shareInfo.length) {
        console.log('\n开始助力...')
        console.log(`${JSON.stringify(shareInfo)}\n`)
        if(txt) console.log(`export DYJ_shareInfo="${txt.slice(0,-1)}"\n`)
        $.index = 0;
		let ck_i = 0,ck_length = cookiesArr.length,data;
        for (let j = 0,sinfo; j < shareInfo.length; j++) {
            sinfo=shareInfo[j];
            if(!helpinfo[sinfo.pin]) helpinfo[sinfo.pin]={};
            if(!helpinfo[sinfo.pin].invite_success) helpinfo[sinfo.pin].invite_success=0;
            if ( helpinfo[sinfo.pin].invite_success>=need_invite ) continue;
            console.log('\n去助力--> ' + sinfo.pin);
            if ($.index === ck_length) {console.time('已无账号可用于助力！结束\n');break};
            for (let i = ck_i; i < ck_length - ck_i; i++) {
                if (cookiesArr[i]) {
                    cookie = cookiesArr[i];
                    $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1]);
                    $.index = i + 1;
                    UA = helpinfo[$.UserName].ua;
                    if($.UserName==sinfo.pin){
                        cookiesArr.push(cookie);
                        ck_length=cookiesArr.length
                        continue;
                    }
                    if(helpinfo[$.UserName].hot) continue;
                    await requestAlgo("638ee",randomString(16))
                    data=await help(sinfo);
                    let msg=data.msg;
                    if (data.code === 0) {
                        helpinfo[sinfo.pin].invite_success++;
                        msg=`助力成功${helpinfo[sinfo.pin].invite_success}次`;
                        console.time(`账号[${$.index}][${$.nickName || $.UserName}]：${msg}`);
                        if(helpinfo[sinfo.pin].invite_taskId){
                            UA = helpinfo[sinfo.pin].ua;
                            cookie = helpinfo[sinfo.pin].cookie;
                            console.time(`车头[${sinfo.pin}]：去领取邀请好友打卡奖励`);
                            await requestAlgo("d06f1",generateFp(16))
                            await Award(helpinfo[sinfo.pin].invite_taskId);
                            await $.wait(500);
                        }
                    } else if (data.code === 147) {//活动太火爆了，请稍后再试
                        helpinfo[$.UserName].hot=1;
                    } else if (data.code === 1006) {
                        msg='不能助力自己！';
                    } else if (data.code === 1007) {//已助力
                        helpinfo[sinfo.pin].invite_success++;
                    } else if (data.code === 1008) {//天助力次数限制
                        msg='今日无助力次数了！';
                    } else if (data.code === 1009) {//助力任务已完成
                        helpinfo[sinfo.pin].invite_success=need_invite;
                        i--;
                    } else {
                        if (data.msg.includes('火爆')) helpinfo[$.UserName].hot=1;
						console.time('此CK助力可能黑了！');
                        msg="code->"+data.code+":"+data.msg;
                    }
                    if (data.code != 0) console.time(`账号[${$.index}][${$.nickName || $.UserName}]：${msg}`);
                    if( DYJ_HelpWait.length>1 ){
                        let s=Math.floor(Math.random() * 1000);
                        console.time(`随机等待${s}Ms`);
                        await $.wait(s)
                    }else if(DYJ_HelpWait[0]){
                        console.time(`固定等待${s}Ms`);
                        await $.wait(DYJ_HelpWait[0])
                    }
                    if (helpinfo[sinfo.pin].invite_success >= need_invite) {
                        console.time(`助力已满${need_invite}，跳出！`);ck_i = i;break
                    };
                }
            }
        }
    } else {
        console.log('无助立马请设置！！\n')
    }

    console.log('\n\n开始领取任务奖励...')
    black_user=[];
    for (let i = 0; i < cookiesArr.length; i++) {
        if (cookiesArr[i]) {
            cookie = cookiesArr[i];
            $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1])
            $.index = i + 1;
            UA = helpinfo[$.UserName].ua;
            let ct=sharePins.includes($.UserName);
            if ( helpinfo[$.UserName].hot && !ct ){
                if( !black_user.includes($.UserName) ) black_user.push($.UserName)
                continue;
            }
            console.log("\n");
            console.time(`【`+(ct?"车头":"")+`账号${$.index}】${$.UserName}`);
            await getinfo(0);
            await $.wait(1000);
            await gettask(ct,1);
            await $.wait(1000);
        }
    }

    console.log(`\n\n统计：
    账号数量：${cookiesArr.length}
    正常:${cookiesArr.length-black_user.length}
    黑名单账号:${black_user.length}
`)

    if(black_user.length){
        fs.writeFile(black_path, black_user.join("&"), function (err) {
            if (err) {
                console.log(err);
                console.log(`\n缓存文件${black_path}更新失败!`);
            } else {
                console.log(`\n缓存文件${black_path}更新成功!`);
            }
        })
    }

})()
    .catch((e) => {
        $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
    })
    .finally(() => {
        $.done();
    })

function getinfo(xc,Pin_i) {
    return new Promise(async (resolve) => {
        let opt= {
            url: `https://api.m.jd.com/api?g_ty=h5&g_tk=&appCode=msc588d6d5&body=%7B%22activeId%22%3A%2263526d8f5fe613a6adb48f03%22%2C%22isFirst%22%3A1%2C%22operType%22%3A1%7D&appid=jdlt_h5&client=jxh5&functionId=makemoneyshop_home&clientVersion=1.2.5&h5st=20221202224421183%3B5zi6yg6hy6dijtc6%3B638ee%3Btk02waef91cf118n77Hw3bHueBsVVy52Wbcx9h4HMPM7fpi9ntRoot7vaa118bRqqEnduYVLqW8kyzHpNsDp5PtrZ8tJ%3B8e13afd153316da1c4878705d9e1f17b27db283c%3B400%3B1669992261183%3Bf28308408a6bad45ead939c02e9cf1e489ad7a120db68c73bdee607bdb6db9daaf6fd9e2d4b87320f4ec869d11fb7fa97ea7bffc29059dfb373214547287d0a2f8d2de03200d84c4776d0464313a08e3488339db94ee9194cfb8237a7678d9020d0c6d9df83ea6c18193626f396ff6f9d41ff0a831b19868640ee15d264ac55bdd144f2a8323f8168cb761f298ab19b00bc20f917401a5f65df079011591dba83f9ee65e3fc211cbadb9211443680603&loginType=2&sceneval=2`,
            headers: {
                'Origin': 'https://wq.jd.com',
                'Referer': 'https://wqs.jd.com/',
                'User-Agent': UA,
                'Cookie': cookie
            }
        };
        $.get(opt, async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(` API请求失败，请检查网路重试`)
                } else {
                    data = JSON.parse(data);
                    if (data.code == 0) {
                        helpinfo[$.UserName].hot = 0;
                        let sId = data.data.shareId;
                        helpinfo[$.UserName].sId = `${sId}`;
                        console.log('当前营业金：' + data.data.canUseCoinAmount);
                        if (xc) {
                            console.log('助力码：' + sId);
                        }
                        if( typeof Pin_i !== "undefined" && Pin_i!=-1 ){
                            await $.wait(500);
                            await gettask(1,0);
                            if(shareInfo[Pin_i].id){
                                if(shareInfo[Pin_i].id!=sId){
                                    shareInfo[Pin_i].id=sId;
                                    console.log('检测到当前用户设置的助力码和获取的不匹配！');
                                }
                            }else{
                                shareInfo[Pin_i].id=sId;
                                console.log('检测到当前用户没有设置助力码哦！');
                            }
                        }
                    } else {
                        console.log(data.msg);
                        if (data.msg.includes('火爆')) console.log('此CK可能黑了！');
                        helpinfo[$.UserName].hot = 1;
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data)
            }
        })
    })
}

function gettask(info,领取) {
    return new Promise(async (resolve) => {
        $.get(taskUrl('newtasksys/newtasksys_front/GetUserTaskStatusList', `__t=${Date.now}&source=makemoneyshop&bizCode=makemoneyshop`), async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(` API请求失败，请检查网路重试`)
                } else {
                    let tostr = data.match(/\((\{.*?\})\n\)/)[1];
                    data = eval('(' + tostr + ')');
                    if (data.ret == 0) {
                        $.tasklist = data.data.userTaskStatusList;
                        let Algo=0;
                        if($.tasklist) for (let item of $.tasklist) {
                            let taskName = item['taskName'],
                            reward = parseInt(item['reward']) / 100,
                            taskId = item['taskId'],
                            configTargetTimes = parseInt(item['configTargetTimes']),
                            status = item.awardStatus;
                            if(taskName == '邀请好友打卡'){
                                helpinfo[$.UserName].invite_success = item['realCompletedTimes']
                                helpinfo[$.UserName].invite_taskId = item['taskId']
                                helpinfo[$.UserName].cookie = cookie
                                if(configTargetTimes!=0 && configTargetTimes!=need_invite) need_invite = configTargetTimes
                                if (helpinfo[$.UserName].invite_success < need_invite){
                                    info && console.log(`最高可邀请${need_invite}人,目前已邀请${helpinfo[$.UserName].invite_success}人,还需邀请${parseInt(need_invite) - parseInt(helpinfo[$.UserName].invite_success)}人`)
                                }else{
                                    info && console.log(`最高可邀请${need_invite}人,目前已邀请${helpinfo[$.UserName].invite_success}人,助力已满`)
                                }
                            }
                            info && console.log(`${taskId} : ${taskName} -- ${reward}个营业币 -- `+(status==1?'已完成':(status==2?'未完成':status)));
                            if ( status !== 1 && 领取 ) {
                                for (let k = 0; k < (item.realCompletedTimes - item.targetTimes + 1); k++) {
                                    console.log(`去领取${taskName}奖励`);
                                    await $.wait(500);
                                    if( !Algo ){
                                        await requestAlgo("d06f1",generateFp(16))
                                        Algo=1
                                    }
                                    await $.wait(500);
                                    await Award(item.taskId);
                                }
                            }
                        }
                    } else {
                        console.log(data.msg);
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data)
            }
        })
    })
}

function Award(id) {
    let _stk="__t,bizCode,isSecurity,source,taskId",__t=Date.now(),
    h5st=H5ST31(_stk,{__t:__t,isSecurity:true,source:"makemoneyshop",taskId:id});
    return new Promise(async (resolve) => {
        $.get(taskUrl('newtasksys/newtasksys_front/Award', `__t=${__t}&source=makemoneyshop&taskId=${id}&isSecurity=true&bizCode=makemoneyshop&_stk=${encodeURIComponent(_stk)}&_ste=1&h5st=${encodeURIComponent(h5st)}`), async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(` API请求失败，请检查网路重试`)
                } else {
                    let tostr = data.match(/\((\{.*?\})\n\)/)[1];
                    data = eval('(' + tostr + ')');
                    if (data.ret == 0) {
                        if(data.data?.prizeInfo) console.log('获得营业金：' + (data.data.prizeInfo / 100) + '元');
                    } else {
                        console.log(data.msg);
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data)
            }
        })
    })
}

function help(sinfo) {
    return new Promise(async (resolve) => {
        /*
        jdltapp;android;4.5.0;;;appBuild/2370;ef/1;ep/%7B%22hdid%22%3A%22JM9F1ywUPwflvMIpYPok0tt5k9kW4ArJEU3lfLhxBqw%3D%22%2C%22ts%22%3A1671188241287%2C%22ridx%22%3A-1%2C%22cipher%22%3A%7B%22sv%22%3A%22CJS%3D%22%2C%22ad%22%3A%22CQU3CQC3DtG5Y2TtDwSnYm%3D%3D%22%2C%22od%22%3A%22DNK0YWDwYJSnYtTvYtK2Cq%3D%3D%22%2C%22ov%22%3A%22CzO%3D%22%2C%22ud%22%3A%22CQU3CQC3DtG5Y2TtDwSnYm%3D%3D%22%7D%2C%22ciphertype%22%3A5%2C%22version%22%3A%221.2.0%22%2C%22appname%22%3A%22com.jd.jdlite%22%7D;Mozilla/5.0 (Linux; Android 12; M2006J10C Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/89.0.4389.72 MQQBrowser/6.2 TBS/046011 Mobile Safari/537.36
        */
        let body={"activeId":"63526d8f5fe613a6adb48f03","shareId":sinfo.id,"operType":1};
        let h5st=H5ST("activeId,shareId",body);
        console.log(h5st);
        let opt= {
            url: `https://api.m.jd.com/api?g_ty=h5&g_tk=&appCode=msc588d6d5&body=${escape(JSON.stringify(body))}&appid=jdlt_h5&client=jxh5&functionId=makemoneyshop_querysharevenderinfo&clientVersion=1.2.5&h5st=${h5st}&loginType=2&sceneval=2`,
            headers: {
                'Origin': 'https://wq.jd.com',
                'Referer': 'https://wqs.jd.com/',
                'User-Agent': UA,
                'Cookie': cookie
            }
        };
        //taskUrl('makemoneyshop/guesthelp', `activeId=63526d8f5fe613a6adb48f03&shareId=${sinfo.id}&_stk=activeId,shareId&_ste=1`)
        $.get(opt, async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(` API请求失败，请检查网路重试`)
                } else {
                    if (safeGet(data)) {
                        data = JSON.parse(data);
                    }else console.log(`解析失败！`)
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data)
            }
        })
    })
}

function taskUrl(fn, body) {
    return {
        url: `https://wq.jd.com/${fn}?g_ty=h5&g_tk=&appCode=msc588d6d5&${body}&sceneval=2&callback=__jsonp${Date.now()}`,
        headers: {
            'Origin': 'https://wq.jd.com',
            'Referer': 'https://wqs.jd.com/',//sns/202210/20/make-money-shop/index.html?activeId=63526d8f5fe613a6adb48f03
            'User-Agent': UA,
            'Cookie': cookie
        }
    }
}

function TotalBean() {
    return new Promise((resolve) => {
        const options = {
            url: 'https://plogin.ck_length.jd.com/cgi-bin/ml/islogin',
            headers: {
                "Cookie": cookie,
                "referer": "https://h5.ck_length.jd.com/",
                "User-Agent": UA,
            },
            timeout: 10000
        }
        $.get(options, (err, resp, data) => {
            try {
                if (data) {
                    data = JSON.parse(data);
                    if (data.islogin === "1") {
                    } else if (data.islogin === "0") {
                        $.isLogin = false;
                    }
                }
            } catch (e) {
                console.log(e);
            }
            finally {
                resolve();
            }
        });
    });
}

Date.prototype.Format = function (fmt) {
	var e,
	n = this,
	d = fmt,
	l = {
		"M+": n.getMonth() + 1,
		"d+": n.getDate(),
		"D+": n.getDate(),
		"h+": n.getHours(),
		"H+": n.getHours(),
		"m+": n.getMinutes(),
		"s+": n.getSeconds(),
		"w+": n.getDay(),
		"q+": Math.floor((n.getMonth() + 3) / 3),
		"S+": n.getMilliseconds()
	};
	/(y+)/i.test(d) && (d = d.replace(RegExp.$1, "".concat(n.getFullYear()).substr(4 - RegExp.$1.length)));
	for (var k in l) {
		if (new RegExp("(".concat(k, ")")).test(d)) {
			var t,
			a = "S+" === k ? "000" : "00";
			d = d.replace(RegExp.$1, 1 == RegExp.$1.length ? l[k] : ("".concat(a) + l[k]).substr("".concat(l[k]).length))
		}
	}
	return d;
}

function H5ST(stk,body) {
    let a='f28308408a6bad45ead939c02e9cf1e48c388a5c93a65cc5402e80317abfd7a2de55d9cb4a8621d63f7e99f47fc5087ee97d3c9c59725ee6ada9268315fd771420487f30b2b3874bef1e72aa7036cbb685538ea214403ffb4580cb345d91e3259c2eb7c70db314c7c5a90c12ff734289847762712a5ed01826268313cbfd9c60a136fccbb1d5a4b50bca2ced84ba93d65cd314fb431a6335f743b11baf1adac418b9d12d5cdbd303f86360387f7ad5ae';
    const timestamp=Date.now();
	const date = new Date(timestamp).Format("yyyyMMddhhmmssSSS");
	let hash1 = '';
    //console.log($.fingerprint,$.Jxmctoken)
	if ($.fingerprint && $.Jxmctoken && $.enCryptMethodJD) {
		hash1 = $.enCryptMethodJD($.Jxmctoken, $.fingerprint.toString(), date, $.appId.toString(), $.CryptoJS).toString($.CryptoJS.enc.Hex);
    }else{
        console.log('H5ST参数有空！')
    }
	let st = '';
	stk.split(',').map((item, index) => {
        st += `${item}:${body[item]}${index === stk.split(',').length - 1 ? '' : '&'}`;
	})
	let hash2 = $.CryptoJS.HmacSHA256(st, hash1.toString()).toString($.CryptoJS.enc.Hex);
    hash2=hash2.substr(0,40)
	return encodeURIComponent([date,$.fingerprint.toString(),$.appId.toString(),$.Jxmctoken,hash2,"400",timestamp.toString(),a].join(";"))
}

function H5ST31(stk,body) {
    let a='f28308408a6bad45ead939c02e9cf1e48c388a5c93a65cc5402e80317abfd7a2de55d9cb4a8621d63f7e99f47fc5087ee97d3c9c59725ee6ada9268315fd771420487f30b2b3874bef1e72aa7036cbb685538ea214403ffb4580cb345d91e3259c2eb7c70db314c7c5a90c12ff734289847762712a5ed01826268313cbfd9c60a136fccbb1d5a4b50bca2ced84ba93d65cd314fb431a6335f743b11baf1adac418b9d12d5cdbd303f86360387f7ad5ae';
    const timestamp=Date.now();
    const date = new Date(timestamp).Format("yyyyMMddhhmmssSSS");
	let hash1 = '';
	if ($.fingerprint && $.Jxmctoken && $.enCryptMethodJD) {
		hash1 = $.enCryptMethodJD($.Jxmctoken, $.fingerprint.toString(), date, $.appId.toString(), $.CryptoJS).toString($.CryptoJS.enc.Hex);
	}else{
        console.log('H5ST31参数有空！')
    }
	let st = '';
        stk.split(',').map((item, index) => {
        st += `${item}:${body[item]}${index === stk.split(',').length - 1 ? '' : '&'}`;
	})
	let hash2 = $.CryptoJS.HmacSHA256(st, hash1.toString()).toString($.CryptoJS.enc.Hex);
    return encodeURIComponent([date,$.fingerprint.toString(),$.appId.toString(),$.Jxmctoken,hash2,"3.1",timestamp.toString(),a].join(";"))
}

async function requestAlgo(appId,fp) {
	$.fingerprint = fp;
	$.appId = appId;
	const options = {
		"url": `https://cactus.jd.com/request_algo?g_ty=ajax`,
		"headers": {
			'Authority': 'cactus.jd.com',
			'Pragma': 'no-cache',
			'Cache-Control': 'no-cache',
			'Accept': 'application/json',
			'User-Agent': UA,//$.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
			'Content-Type': 'application/json',
			'Origin': 'https://st.jingxi.com',
			'Sec-Fetch-Site': 'cross-site',
			'Sec-Fetch-Mode': 'cors',
			'Sec-Fetch-Dest': 'empty',
			'Referer': 'https://st.jingxi.com/',
			'Accept-Language': 'zh-CN,zh;q=0.9,zh-TW;q=0.8,en;q=0.7'
		},
		'body': JSON.stringify({
			"version": "1.0",
			"fp": $.fingerprint,
			"appId": appId,
			"timestamp": Date.now(),
			"platform": "web",
			"expandParams": ""
		})
	}
	new Promise(async resolve => {
		$.post(options, (err, resp, data) => {
			try {
				if (err) {
					console.log(`${JSON.stringify(err)}`)
					console.log(`request_algo 签名参数API请求失败，请检查网路重试`)
					llgeterror = true;
				} else {
					if (data) {
						data = JSON.parse(data);
						if (data['status'] === 200) {
							$.Jxmctoken = data.data.result.tk;
							let enCryptMethodJDString = data.data.result.algo;
							if (enCryptMethodJDString)
								$.enCryptMethodJD = new Function(`return ${enCryptMethodJDString}`)();
						} else {
							console.log('request_algo 签名参数API请求失败:')
						}
					} else {
						llgeterror = true;
						console.log(`京东服务器返回空数据`)
					}
				}
			} catch (e) {
				llgeterror = true;
				$.logErr(e, resp)
			}
			finally {
				resolve();
			}
		})
	})
}

function randomString(e) {
    e = e || 32;
    let t = "abcdefghijklmnopqrstuvwxyz0123456789", a = t.length, n = "";
    for (i = 0; i < e; i++)
      n += t.charAt(Math.floor(Math.random() * a));
    return n
}

function generateFp(a) {
	let e = "0123456789";
	a = a || 13;
	let i = '';
	for (; a--; )
		i += e[Math.random() * e.length | 0];
	return (i + Date.now()).slice(0, 16)
}

function safeGet(data) {
    try {
        if (typeof JSON.parse(data) == "object") {
            return true;
        }
    } catch (e) {
        console.log(e);
        console.log(`京东服务器访问数据为空，请检查自身设备网络情况`);
        return false;
    }
}

function jsonParse(str) {
    if (typeof str == "string") {
        try {
            return JSON.parse(str);
        } catch (e) {
            console.log(e);
            $.msg($.name, '', '请勿随意在BoxJs输入框修改内容\n建议通过脚本去获取cookie')
            return [];
        }
    }
}
// prettier-ignore
function Env(t,e){"undefined"!=typeof process&&JSON.stringify(process.env).indexOf("GITHUB")>-1&&process.exit(0);class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),n={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(n,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?(this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)})):this.isQuanX()?(this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t))):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)}))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="POST",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r))),!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`❗️${this.name}, 错误!`,t.stack):this.log("",`❗️${this.name}, 错误!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}
