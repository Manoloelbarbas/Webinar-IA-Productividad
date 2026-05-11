(function () {
  function initComparison() {
    var container = document.querySelector('.slide-comparison-wrap .comparison-container');
    if (!container) return;

    var beforeImage = container.querySelector('.image-before');
    var sliderLine  = container.querySelector('.slider-line');
    var sliderKnob  = container.querySelector('.slider-knob');

    var isDragging = false;
    var currentPosition = 50;

    function updateSlider(position) {
      position = Math.max(0, Math.min(100, position));
      currentPosition = position;
      beforeImage.style.clipPath = 'inset(0 ' + (100 - position) + '% 0 0)';
      sliderLine.style.left = position + '%';
      sliderKnob.style.left = position + '%';
    }

    function handleMove(clientX) {
      var rect = container.getBoundingClientRect();
      var x = clientX - rect.left;
      updateSlider((x / rect.width) * 100);
    }

    sliderKnob.addEventListener('mousedown', function (e) {
      isDragging = true;
      container.classList.add('dragging');
      e.preventDefault();
    });

    container.addEventListener('mousedown', function (e) {
      if (e.target === sliderKnob) return;
      isDragging = true;
      container.classList.add('dragging');
      handleMove(e.clientX);
    });

    document.addEventListener('mousemove', function (e) {
      if (!isDragging) return;
      handleMove(e.clientX);
    });

    document.addEventListener('mouseup', function () {
      isDragging = false;
      container.classList.remove('dragging');
    });

    sliderKnob.addEventListener('touchstart', function (e) {
      isDragging = true;
      container.classList.add('dragging');
      e.preventDefault();
    }, { passive: false });

    container.addEventListener('touchstart', function (e) {
      if (e.target === sliderKnob) return;
      isDragging = true;
      container.classList.add('dragging');
      handleMove(e.touches[0].clientX);
    }, { passive: false });

    document.addEventListener('touchmove', function (e) {
      if (!isDragging) return;
      handleMove(e.touches[0].clientX);
    }, { passive: false });

    document.addEventListener('touchend', function () {
      isDragging = false;
      container.classList.remove('dragging');
    });

    sliderKnob.setAttribute('aria-valuemin', '0');
    sliderKnob.setAttribute('aria-valuemax', '100');
    sliderKnob.setAttribute('aria-valuenow', '50');

    sliderKnob.addEventListener('keydown', function (e) {
      var pos = currentPosition;
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
          pos -= 5;
          e.preventDefault();
          break;
        case 'ArrowRight':
        case 'ArrowUp':
          pos += 5;
          e.preventDefault();
          break;
        case 'Home':
          pos = 0;
          e.preventDefault();
          break;
        case 'End':
          pos = 100;
          e.preventDefault();
          break;
        default:
          return;
      }
      updateSlider(pos);
      sliderKnob.setAttribute('aria-valuenow', Math.round(currentPosition));
    });

    updateSlider(50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initComparison);
  } else {
    initComparison();
  }
})();
