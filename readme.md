# ABCWallet Embed - 让用户即刻拥有数字资产

## 简介
ABCWallet Embed 是一个简单、安全的秘钥管理方案。用户可以以熟悉的方式来进入区块链世界，降低了用户理解区块链的门槛。
开发者可以非常简单地把 ABCWallet Embed 集成到 Dapps 里面，从而降低用户的获取成本，提高 Dapp 收益。

## 使用
ABCWallet Embed 提供了一个 web3 provider，它可以用于实例化 Web3。这个 provider 和 Metamask 的 provider 完全兼容，因此你可以用和 Web3 一致的 API 来使用 ABCWallet Embed。

1. 安装
`npm install abcwallet-embed --save`

2. 初始化
```javascript
import ABCWalletEmbed from 'abcwallet-embed'
import Web3 from 'web3'

;(async function() {
  const sdk = new ABCWalletEmbed()
  
  await sdk.init()
  await sdk.login()

  const web3 = new Web3(sdk.provider)
    
  window.Web3 = sdk.Web3
  window.web3 = web3
    
  web3.eth.getAccounts((err, accounts) => {
    console.log(accounts)
    web3.eth.getBalance(accounts[0], (err, res) => {
      console.log(res)
    })
  })
})()
```

## 背景
区块链生态中最重要的组成部分有两个：数字资产和 Dapp。
然而对于普通用户来说，最大的难题在于理解区块链的知识：公钥、私钥、Keystore、签名、备份等等等等。
在用户好不容易理解完这些知识后，还需要做大量的准备工作：下载钱包、生成公私钥、备份私钥（还不能复制，需要手抄）……
等用户克服重重阻碍完成这些任务之后，早已丧失了对于区块链的兴趣：什么东西，这么复杂，都是骗子。

而这些，正是 ABCWallet Embed 想要解决的问题。

## 特点
 - 简单。用户不需要理解复杂的区块链知识，只需要有一个 Twitter、Google、Facebook 账号，即可快速获取数字资产、畅游 Dapp 世界。
 - 安全。用户的私钥存储于用户本地，任何人无法获取到用户的私钥（包括我们），让用户的资产得到最大程度的保障。
 - 跨平台。无论是 Windows 还是 Mac，也无论是桌面端还是移动端，只要有浏览器的地方，用户都可以随时随地畅玩区块链世界。

## 技术概要
ABCWallet Embed 会在 Dapp 中加载一个 iframe，用户的私钥及相关信息会通过该 iframe 存储在用户本地。无论是 Dapp 开发者还是 ABCWallet 都无法获取到用户的私钥。
Embed 会响应 Dapp 的请求，包括签名、交易、查询等等，并将需要的请求进行转发到 iframe 中。在 iframe 处理完之后会将结果响应给 Embed，最终完成对于 Dapp 的请求的响应。
在这个过程中，对于必要的请求，iframe 会触发一个弹窗，让用户进行确认、身份校验等操作。

## 注意
1. 由于网页内弹窗（Modal）存在被攻击的风险（Clickjacking），因此所有的交互（输入密码、转账确认）都是通过弹窗实现。
2. 用户需要允许你的 Dapp 页面弹出新窗口，不然的话无法进行确认、输入密码等操作。
