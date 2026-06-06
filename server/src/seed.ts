import { itemService } from './services/itemService'
import { getDatabase, closeDatabase } from './database'

getDatabase()

const seedItems = [
  {
    title: '情侣款陶瓷马克杯',
    description: '一对印有星座图案的马克杯，曾是我们的早安仪式。',
    story: '每天早上我们会用这对杯子喝牛奶，他总说用这个杯子泡的咖啡更好喝。现在只剩我一个人了，留着它只会让我想起那些再也回不去的清晨。',
    price: 88,
    imageUrl: 'https://picsum.photos/seed/cup/600/400',
    emotionTags: '怀念,遗憾',
    category: '家居用品',
    condition: '轻微使用'
  },
  {
    title: '未拆封的香水礼盒',
    description: '他说要在纪念日送我的礼物，还没等到那一天我们就分开了。',
    story: '这是他准备了很久的礼物，我知道他选了很久的味道。可是当他把礼物拿给我的时候，我们已经说好了要分手。我收下了礼物，却永远不会拆开它。',
    price: 520,
    imageUrl: 'https://picsum.photos/seed/perfume/600/400',
    emotionTags: '遗憾,心痛',
    category: '美妆护肤',
    condition: '全新'
  },
  {
    title: '旅行拍立得相册',
    description: '记录了我们三年旅行时光的拍立得相册，共128张照片。',
    story: '每一张照片背后都写着日期和地点，我们约定好要走遍世界的每个角落。现在相册里最后一页是空白的，而我们的故事也到此为止了。',
    price: 365,
    imageUrl: 'https://picsum.photos/seed/album/600/400',
    emotionTags: '怀念,告别',
    category: '收藏品',
    condition: '几乎全新'
  },
  {
    title: '共同养过的猫的玩具',
    description: '我们一起养的猫最喜欢的逗猫棒和小老鼠。',
    story: '我们一起养了一只叫"年糕"的猫，分手时他带走了年糕，却把玩具都留给了我。每次看到这些玩具，我都会想起年糕在家中奔跑的样子。希望它在新家过得好。',
    price: 50,
    imageUrl: 'https://picsum.photos/seed/cattoy/600/400',
    emotionTags: '怀念,释然',
    category: '其他',
    condition: '明显使用'
  },
  {
    title: '他送我的第一份礼物',
    description: '一条银质项链，吊坠是一枚小钥匙。',
    story: '他说这把钥匙能打开他的心门。现在门已经关上了，钥匙也该换个主人了。愿下一个收到它的人，能拥有一把永远不会被收回的钥匙。',
    price: 200,
    imageUrl: 'https://picsum.photos/seed/necklace/600/400',
    emotionTags: '遗憾,成长',
    category: '服饰配饰',
    condition: '轻微使用'
  },
  {
    title: '我们的电影票根收藏夹',
    description: '收藏了两年的电影票根，共76张。',
    story: '我们每周五都会去看电影，每次都会把票根放进这个收藏夹。最后一张票根是《花束般的恋爱》，那天我们看完电影后，他说我们也像电影里的情侣一样。',
    price: 131.4,
    imageUrl: 'https://picsum.photos/seed/tickets/600/400',
    emotionTags: '怀念,遗憾,告别',
    category: '收藏品',
    condition: '轻微使用'
  },
  {
    title: '他留下的旧毛衣',
    description: '他最喜欢的那件灰色毛衣，我偷偷留下的。',
    story: '他搬走那天落下了这件毛衣，我没有告诉他。我穿着它度过了最难过的那个冬天。现在春天来了，我也该把它送走了。',
    price: 99,
    imageUrl: 'https://picsum.photos/seed/sweater/600/400',
    emotionTags: '心痛,释然',
    category: '服饰配饰',
    condition: '明显使用'
  },
  {
    title: '我们一起拼的乐高城堡',
    description: '花了三个月拼完的乐高迪士尼城堡。',
    story: '每天下班回家我们会一起拼一会儿，他总说拼完了要放在我们的婚礼上。现在城堡拼好了，婚礼却遥遥无期。希望它能找到一个相信童话的新主人。',
    price: 2000,
    imageUrl: 'https://picsum.photos/seed/lego/600/400',
    emotionTags: '遗憾,释怀,新生',
    category: '收藏品',
    condition: '几乎全新'
  },
  {
    title: '她喜欢的那本书',
    description: '《小王子》，她在书页空白处写满了批注。',
    story: '她总说我像小王子一样，需要人照顾。现在我终于学会了照顾自己，她却不在了。我把她写的每一句话都读了很多遍，现在想把这本书送给同样相信爱的人。',
    price: 52,
    imageUrl: 'https://picsum.photos/seed/book/600/400',
    emotionTags: '成长,感恩,释怀',
    category: '书籍文具',
    condition: '明显使用'
  },
  {
    title: '情侣款运动手环',
    description: '一对黑色运动手环，我们跑步时戴的。',
    story: '我们约定每天晚上一起跑步，互相监督运动目标。手环上还记着我们最后一次一起跑步的数据：5.20公里。现在我一个人也能跑完5公里了。',
    price: 300,
    imageUrl: 'https://picsum.photos/seed/watch/600/400',
    emotionTags: '成长,告别',
    category: '运动户外',
    condition: '轻微使用'
  },
  {
    title: '他用过的机械键盘',
    description: 'Cherry红轴机械键盘，他打游戏时最喜欢用的。',
    story: '以前总抱怨他打游戏不理我，现在房间里再也没有键盘敲击的声音了。他说这把键盘敲出来的代码会有好运，希望下一个主人也能写出没有bug的代码。',
    price: 600,
    imageUrl: 'https://picsum.photos/seed/keyboard/600/400',
    emotionTags: '释然,遗忘',
    category: '数码产品',
    condition: '轻微使用'
  },
  {
    title: '我们的情侣头像画稿',
    description: '她是插画师，这是她为我们画的情侣头像草稿。',
    story: '她画了很多稿，说要找到最像我们的样子。直到分手那天，她还在修改。这是未完成的画稿，也是我们未完成的故事。',
    price: 233,
    imageUrl: 'https://picsum.photos/seed/drawing/600/400',
    emotionTags: '遗憾,心痛,新生',
    category: '收藏品',
    condition: '几乎全新'
  }
]

async function seed() {
  console.log('开始填充种子数据...')

  for (const item of seedItems) {
    await itemService.create(item)
    console.log(`已创建: ${item.title}`)
  }

  console.log('种子数据填充完成！')
  closeDatabase()
}

seed().catch(console.error)
