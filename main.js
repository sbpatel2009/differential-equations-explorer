function parseSystem(input) {
  // Parses "dx/dt = ..." and "dy/dt = ..." etc
  const eqs = input.split('\n').map(s => s.trim()).filter(Boolean);
  const vars = [];
  const fns = [];
  for (const eq of eqs) {
    const [lhs, rhs] = eq.split('=').map(s=>s.trim());
    const v = lhs.split('/')[0].replace('d', '');
    vars.push(v);
    fns.push(math.parse(rhs).compile());
  }
  return {vars, fns};
}

function parseInitial(input, vars) {
  const vals = {};
  input.split(',').forEach(pair => {
    const [k, v] = pair.split('=').map(s=>s.trim());
    if(vars.includes(k)) vals[k] = parseFloat(v);
  });
  return vars.map(v => vals[v]);
}

function rk4(fns, y0, t0, t1, steps) {
  const h = (t1-t0)/steps;
  const ys=[y0], ts=[t0];
  let y = y0.slice(), t = t0;
  for(let i=0;i<steps;i++) {
    let k1 = fns.map(f=>f.evaluate({t, x: y[0], y: y[1]}));
    let k2 = fns.map(f=>f.evaluate({t: t+h/2, x: y[0]+h*k1[0]/2, y: y[1]+h*k1[1]/2}));
    let k3 = fns.map(f=>f.evaluate({t: t+h/2, x: y[0]+h*k2[0]/2, y: y[1]+h*k2[1]/2}));
    let k4 = fns.map(f=>f.evaluate({t: t+h, x: y[0]+h*k3[0], y: y[1]+h*k3[1]}));
    y = y.map((v,j)=>v + h*(k1[j]+2*k2[j]+2*k3[j]+k4[j])/6);
    t += h;
    ys.push(y.slice());
    ts.push(t);
  }
  return {ys, ts};
}

function solveAndPlot() {
  const sys = parseSystem(document.getElementById('systemInput').value);
  const y0 = parseInitial(document.getElementById('initInput').value, sys.vars);
  const [t0, t1] = document.getElementById('timeSpan').value.split(',').map(Number);
  const sol = rk4(sys.fns, y0, t0, t1, 200);

  // Plot time series
  const data = sys.vars.map((v,j)=>({
    x: sol.ts, y: sol.ys.map(y=>y[j]), name: v, mode:'lines'
  }));
  Plotly.newPlot('plot', data, {title: 'Numerical Solution', xaxis:{title:'t'}, yaxis:{title:'Variables'}});

  // Phase portrait (x vs y for 2d systems)
  if(sol.ys[0].length>=2) {
    Plotly.newPlot('phasePortrait', [{
      x: sol.ys.map(y=>y[0]), y: sol.ys.map(y=>y[1]), mode:'lines', name:'Trajectory'
    }], {title:'Phase Portrait', xaxis:{title:sys.vars[0]}, yaxis:{title:sys.vars[1]}});
  } else {
    document.getElementById('phasePortrait').innerHTML = '';
  }
}
