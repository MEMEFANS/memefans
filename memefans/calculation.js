// 代币计算逻辑
document.addEventListener('DOMContentLoaded', () => {
  const totalTokens = document.getElementById('total-tokens');
  const numPackages = document.getElementById('num-packages');
  const result = document.getElementById('token-result');
  const distributionType = document.getElementById('distribution-type');
  const randomRange = document.getElementById('random-range');
  const minTokens = document.getElementById('min-tokens');
  const maxTokens = document.getElementById('max-tokens');

  if (!totalTokens || !numPackages || !result || !distributionType || !randomRange || !minTokens || !maxTokens) {
    console.error('找不到必需的DOM元素');
    return;
  }

  function calculate() {
    console.log('计算中...');
    const total = parseFloat(totalTokens.value) || 0;
    const packages = parseInt(numPackages.value) || 1;
    console.log('总代币:', total, '礼物包数量:', packages);
    
    if (total > 0 && packages > 0) {
      const perPackage = (total / packages).toFixed(4);
      console.log('每个包的代币数量:', perPackage);
      result.textContent = perPackage;
      
      if (distributionType.value === 'random') {
        randomRange.style.display = 'block';
        minTokens.value = (perPackage * 0.5).toFixed(4);
        maxTokens.value = (perPackage * 1.5).toFixed(4);
      } else {
        randomRange.style.display = 'none';
      }
    }
  }

  // 添加事件监听器
  totalTokens.addEventListener('input', calculate);
  numPackages.addEventListener('input', calculate);
  distributionType.addEventListener('change', calculate);
  
  // 初始计算
  calculate();
});
