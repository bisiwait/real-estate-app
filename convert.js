const fs = require('fs');
const csv = require('csv-parser');
const { Parser } = require('json2csv');

const results = [];
const inputFile = 'pattaya-real-estate2.csv'; // あなたが今送ってくれたファイル名
const outputFile = 'supabase_import.csv';

fs.createReadStream(inputFile)
  .pipe(csv())
  .on('data', (data) => {
    // 価格から記号を除去して数値にする
    let rawPrice = data['price_list'] || "0";
    let cleanPrice = parseInt(rawPrice.replace(/[^0-9]/g, ''), 10);

    const row = {
      title: data['title_list'],
      price: isNaN(cleanPrice) ? 0 : cleanPrice,
      description: data['title_list'], // 説明文がないので一旦タイトルを入れる
      image_url: data['image_list'],   // 今回のCSVの列名に合わせました
      location: 'Pattaya'
    };
    results.push(row);
  })
  .on('end', () => {
    const json2csvParser = new Parser();
    const csvData = json2csvParser.parse(results);
    fs.writeFileSync(outputFile, csvData);
    console.log('変換完了！ supabase_import.csv が作成されました');
  });