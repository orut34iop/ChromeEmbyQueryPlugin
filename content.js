// This script runs in the context of web pages

// 创建浮动图标
const icon = document.createElement('img');
icon.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAAgY0hSTQAAeiYAAICEAAD6AAAAgOgAAHUwAADqYAAAOpgAABdwnLpRPAAABEZJREFUaIHN2VuIVXUUx/HPzKQ2k1qWaIk3suimIpSQWRlZD0ZFUGBhRRBREkXQBY2E8qEs6qELBFFPhQnVSzBFIklRSmJkUZjYhQqKLMlLZXaZ08Pap70dzj5n73P2zOkLG2Fc/99//f//fdZ/rbX5fzAX3+LFsgN7StidgfMxD7NxAvoxhF/xE77BLnycPH8U1N+EpYnGlIJjCnEiHsJXqJV8fsdm3NhijsszY+4p62DeCYzDatyLgczfa+Kov8CPiZM9GI+p4mRmoC8zZgjH4WCDecaKkzo90ZyLw2UXMZxp+EC6K/9gECsSJ1sxEReIDdiIJ+Vv1B2Zea7uyOuEk7A7I7oRZ1Uh3IBJ4p2v4V3Ff4+59OH9RHBI7GDHok14IjPXOVUIrpTu/JoqBJswR0SoGl6qQvAoEQJr4hR6qxBtwqvJXL9hZhWCS6W7f1kVgk24ULw2NaytSnRdIvgzxlQl2oBebEvm+h4TcuzGYUnybyEGE9E3O3SwFTdIT/rmJnbPJDabcUwR4e3JgOc6dLAZA/gumWeHIy+74ayRLnQTjm4lPhoLeCDj1CUtbHvxbMb+ZS1C+huJ4WDHbjZmGg4kc7xecEwv1ksXsaqZ8WOJ0R7Nj7ZdXkj0/xR5T1HGYUsy9i+cl2e4TLrSc9t2szEL8Hei/XQb42eK6FjD53J+D/3Ynxg91Zab+WxKdH/B5DY1rpNu8P15Rs8nBvtE+lsFV2QmvrtDrfpG7MfxjQzmq/aGHIOdid5uJS6lHBZK/VudZ/SaNEeZ3eGEp6k418fbid6XcvK1U0SVVb9AOolIPbgTd6kuLV8h3ZSz84zuyxiNdFpdlkkiFNeEnw3pEzlIvZy8alRcK84O4dv6ZkZTRfFe7y5cNOJuFecV4dd7rQzni9hdEx2FVvnLaFG/1T8qYrxYmsMcwrUj51dhNkgrx0Iswl5pAf6wKEG7Rf03UKqWPlM0nurR6R3Mqty11syQ5lW3lx08WfSJ6ovYh9uMfAMgy6PSzHR6OwK9Ii+vt0RqohhaUpGDzViQmbdpCC3CPGyVLmJI1NOLOxXOYY40rO9X0evbh1vwgyO70ltFR3ogf2gprhSFVk28/9dUpPsfE0S9Wy866s8BcdTLla8D+nAp3sroHcb1ww2r7H2Ox024VbTJswyJamo7PsPXoj1/MPm/AfFhY47ok17syE74zkR7WzuO9YuWeVF6RO7+uPhaU/bDSPbZJSLd2GaTNWMiPhEV0ALxpaYss8SnqYXiZE4VX36GOzUk3vVPxS07KG33tM0j0igzrxOhYYwRv4uTxYKmi9eo0nb+bGlxs6FK4dGinjQd0nl5OeoskhbQ67rsS2l6pN2wPTi2u+6UZ7k0jK3ssi+l6ReXTE2Es27m/W2xSrr7y7rsSyGycXeK6KBNFAnag13wZ4s4+bZYq7Nrv4pnb1mns9XUhyLmd5MtZQf8C7r2Y0Ja2Jg7AAAAAElFTkSuQmCC';
icon.style.position = 'absolute';
icon.style.width = '32px';
icon.style.height = '32px';
icon.style.cursor = 'pointer';
icon.style.zIndex = '10000';
document.body.appendChild(icon);

// 使图标跟随鼠标选中的文本位置
document.addEventListener('mouseup', (event) => {
  const selectedText = window.getSelection().toString().trim();
  if (selectedText) {
    icon.style.left = `${event.pageX + 10}px`;
    icon.style.top = `${event.pageY + 10}px`;
    icon.style.display = 'block';
  } else {
    icon.style.display = 'none';
  }
});

// 点击图标时处理选中文本
icon.addEventListener('click', () => {
  const selectedText = window.getSelection().toString().trim();
  if (selectedText) {
    fetch('http://localhost:5000/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: selectedText })
    })
    .then(response => response.json())
    .then(data => {
      alert(data.result);
    })
    .catch(error => {
      alert('Error processing text: ' + error.message);
    });
  } else {
    alert('Please select some text first!');
  }
});
