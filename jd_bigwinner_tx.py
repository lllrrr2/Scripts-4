# -*- coding:utf-8 -*-
"""
Python 3.9.7
作者：doubi
日期：2022年10月30日
多个&隔开
export dyjpin="需要提现的pin值"
export DYJ_NotCash="不提现的金额"
cron: 0 0 0 * * *
new Env('赚钱大赢家-定时提现');
TY在原作者基础上删减更改，优化提取
"""

import os
import re
import sys
import time
import uuid
import json
import random
import logging
import requests
import traceback
from hashlib import sha1
from urllib.parse import quote_plus, unquote_plus, quote

activity_name = "京东极速版-赚钱大赢家-定时提现"
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(lineno)d %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger(activity_name)
index = 0
h5st_appid = 'd06f1'
appCode = 'msc588d6d5'
activeId = '63526d8f5fe613a6adb48f03'
not_tx=[]

class Userinfo:
    cookie_obj = []
    index = 0

    def __init__(self, cookie):
        global index
        index += 1
        self.user_index = index
        self.uuid=''.join(str(uuid.uuid4()).split('-')) #15587980619082418
        self.cookie = cookie
        try:
            self.pt_pin = unquote_plus(re.findall(r'pt_pin=([^; ]+)(?=;?)', self.cookie)[0])
        except Exception:
            logger.info(f"取值错误['pt_pin']：{traceback.format_exc()}")
            return
        self.name = unquote_plus(self.pt_pin)
        self.UA = 'jdltapp;iPhone;4.2.0;;;M/5.0;hasUPPay/0;pushNoticeIsOpen/1;lang/zh_CN;hasOCPay/0;appBuild/1217;supportBestPay/0;jdSupportDarkMode/0;ef/1;ep/%7B%22ciphertype%22%3A5%2C%22cipher%22%3A%7B%22ud%22%3A%22DtCzCNvwDzc4CwG0CWY2ZWTvENVwCJS3EJDvEWDsDNHuCNU2YJqnYm%3D%3D%22%2C%22sv%22%3A%22CJSkDy42%22%2C%22iad%22%3A%22C0DOGzumHNSjDJvMCy0nCUVOBJvLEOYjG0PNGzCmHOZNEJO2%22%7D%2C%22ts%22%3A1667286187%2C%22hdid%22%3A%22JM9F1ywUPwflvMIpYPok0tt5k9kW4ArJEU3lfLhxBqw%3D%22%2C%22version%22%3A%221.0.3%22%2C%22appname%22%3A%22com.360buy.jdmobile%22%2C%22ridx%22%3A-1%7D;Mozilla/5.0 (iPhone; CPU iPhone OS 12_7_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E126;supportJDSHWK/1'
        self.account_hot = False
        self.help_status = False
        Userinfo.cookie_obj.append(self)
        self.sha = sha1(str(self.pt_pin).encode('utf-8')).hexdigest()
        self.headers = {
            "Host": "api.m.jd.com",
            "Cookie": self.cookie + f"; sid={self.sha}; visitkey={uuid}",
            "User-Agent": self.UA,
            "origin": "https://wqs.jd.com",
            #"Referer": f"https://wqs.jd.com/sns/202210/20/make-money-shop/guest.html?activeId={activeId}&type=sign&shareId=&__navVer=1",
            "Referer": "https://wqs.jd.com/"
        }
        self.shareUuid = ""
        self.invite_success = 0
        self.task_list = []
        self.need_help = False

    def UserTask(self):
        global not_tx
        t=int(time.time() * 1000) #1671188533831
        body=quote(json.dumps({"activeId":activeId,"sceneval":2,"buid":325,"appCode":appCode,"time":t,"signStr":""})) #07a9d66103b6ae8c0afd1dec831027bf
        t=t+1
        url = f'https://api.m.jd.com/api?functionId=makemoneyshop_exchangequery&appid=jdlt_h5&channel=jxh5&cv=1.2.5&clientVersion=1.2.5&client=jxh5&uuid={self.uuid}&cthr=1&body={body}&t={t}&loginType=2'
        self.headers["Host"]="api.m.jd.com"
        res = requests.get(url=url, headers=self.headers).json()
        if res['code'] == 0:
            logger.info(f"获取微信提现信息成功")
            stockPersonDayLimit=int(res['data']['stockPersonDayLimit'])#用户日库存限额
            stockPersonDayUsed=int(res['data']['stockPersonDayUsed'])#用户今天提现多少次
            canUseCoinAmount = float(res['data']['canUseCoinAmount'])
            logger.info(f"当前余额[{canUseCoinAmount}]元")
            if stockPersonDayUsed>=stockPersonDayLimit:
                logger.info(f"当前提现次数已经达到上限[{stockPersonDayLimit}]次")
            elif 'exchangeRecordList' in res['data']:
                logger.info(f"已有提现进行中，请等待完成！")
            else:
                for data in res['data']['cashExchangeRuleList'][::-1]:#倒序
                    if data['exchangeStatus']==1:
                        if canUseCoinAmount >= float(data['cashoutAmount']):
                            if float(data['cashoutAmount']) not in not_tx:
                                logger.info(f"当前余额[{canUseCoinAmount}]元,符合提现规则[{data['cashoutAmount']}]门槛")
                                rule_id = data['id']
                                if self.tx(rule_id):break
                            else:logger.info(f"当前余额[{canUseCoinAmount}]元,不提现[{not_tx}]门槛")
                        else:logger.info(f"当前余额[{canUseCoinAmount}]元,不足提现[{data['cashoutAmount']}]门槛")
                    elif data['exchangeStatus']==2:logger.info(f"{data['name']},来晚了咯都被抢光了")
                    elif data['exchangeStatus']==3:logger.info(f"{data['name']},已兑换")
                    elif data['exchangeStatus']==4:logger.info(f"{data['name']},已抢光")
                    else:logger.info(f"未知状态：{data}")
        else:
            print(res)

    def tx(self, rule_id):
        url = f'https://wq.jd.com/prmt_exchange/client/exchange?g_ty=h5&g_tk=&appCode={appCode}&bizCode=makemoneyshop&ruleId={rule_id}&sceneval=2'
        res = requests.get(url=url, headers=self.headers).json()
        if res['ret'] == 0:
            logger.info(f"车头账户[{self.name}]：提现成功")
            return True
        if res['ret'] == 232:#库存不足
            logger.info(f"车头账户[{self.name}]：{res['msg']}")
            return False
        if res['ret'] == 604:
            logger.info(f"车头账户[{self.name}]：{res['msg']}")
            return True
        if res['ret'] == 246: #日上限
            logger.info(f"车头账户[{self.name}]：{res['msg']}")
            return True
        if res['ret'] == 248:#操作过快
            logger.info(f"车头账户[{self.name}]：{res['msg']}")
            return False
        else:
            logger.info(f"车头账户[{self.name}]：{res}")
            return False


def getTime():
    return int(time.time() * 1000)

def main():
    try:
        cookies = os.environ['JD_COOKIE'].split('&')
    except:
        with open(os.path.join(os.path.dirname(__file__), 'cklist.txt'), 'r') as f:
            cookies = f.read().split('\n')
    helpPin = os.environ.get('dyjpin', "")
    '''
    if helpPin == "":
        logger.info("您尚未填写'dyjpin'-- pin1&pin2&pin")
        sys.exit()
    try:
        helpPin = helpPin.split('&')
    except:
        logger.info("dyjpin填写格式错误，pin1&pin2&pin3")
        sys.exit()'''
    [Userinfo(cookie) for cookie in cookies]
    '''
    black = black_user()
    if black:
        del black[-1]
        for pin in black:
            del_black(pin)
    logger.info(f"共去除{len(black)}个黑名单pin")
    logger.info(f"当前剩余[{len(Userinfo.cookie_obj)}]个cookie可助力")
    inviterList = (
        [cookie_obj for cookie_obj in Userinfo.cookie_obj for name in helpPin if name in cookie_obj.pt_pin])
    if not inviterList:
        logger.info(f"没有找到车头:{helpPin}")
        sys.exit()
    logger.info(f"共找到[{len(inviterList)}]车头")'''
    for inviter in Userinfo.cookie_obj:
        logger.info(f"\n\n开启账户：{inviter.pt_pin}\n\n")
        inviter.UserTask()
    time.sleep(round(random.uniform(0.7, 1.3), 2))
    for cookie in Userinfo.cookie_obj:
        if cookie.account_hot:
            if cookie.pt_pin in str(black):
                continue
            if cookie.pt_pin in helpPin:
                continue
            with open(f'{black_user_file}.txt', 'a') as w:
                w.write(cookie.pt_pin + '&')

if __name__ == '__main__':
    main()
