import requests
import json

# ================= 配置区域 =================
# 请将下面的 URL 替换为你 Vercel 上显示的实际 Domain
# 注意：不要带最后的斜杠 /
BASE_URL = "https://zhiji-oracle-api.vercel.app" 
# ===========================================

def print_separator(title):
    print(f"\n{'='*20} {title} {'='*20}")

def test_root():
    """测试根路径，检查服务是否存活"""
    url = f"{BASE_URL}/"
    print_separator("测试 1: 服务连通性 (Root)")
    try:
        response = requests.get(url)
        print(f"状态码: {response.status_code}")
        print(f"响应内容: {response.text}")
        
        if response.status_code == 200:
            print("✅ 服务连接成功！")
        else:
            print("❌ 服务连接异常，请检查 Vercel 日志。")
    except Exception as e:
        print(f"❌ 请求失败: {e}")

def test_bazi():
    """测试八字排盘接口"""
    url = f"{BASE_URL}/api/bazi"
    print_separator("测试 2: 八字排盘 (Bazi)")
    
    payload = {
        "dateStr": "2024-02-10 12:00" # 随便构造一个时间
    }
    
    try:
        print(f"发送数据: {json.dumps(payload, ensure_ascii=False)}")
        response = requests.post(url, json=payload)
        
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ 八字排盘成功！")
            # 漂亮地打印返回的 JSON
            print(json.dumps(data, indent=2, ensure_ascii=False))
        else:
            print(f"❌ 失败: {response.text}")
            
    except Exception as e:
        print(f"❌ 请求失败: {e}")

def test_ziwei():
    """测试紫微斗数接口"""
    url = f"{BASE_URL}/api/ziwei"
    print_separator("测试 3: 紫微斗数 (Ziwei)")
    
    payload = {
        "dateStr": "2024-02-10 12:00",
        "gender": "男",
        "timeIndex": 6 # 午时
    }
    
    try:
        print(f"发送数据: {json.dumps(payload, ensure_ascii=False)}")
        response = requests.post(url, json=payload)
        
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ 紫微排盘成功！")
            print(json.dumps(data, indent=2, ensure_ascii=False))
        else:
            print(f"❌ 失败: {response.text}")
            
    except Exception as e:
        print(f"❌ 请求失败: {e}")

if __name__ == "__main__":
    print(f"🚀 开始测试 API: {BASE_URL}")
    
    test_root()
    test_bazi()
    test_ziwei()
    
    print("\n🏁 测试结束")