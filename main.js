function parseSystem(input) {
  // Parses "dx/dt = ..." and "dy/dt = ..." etc
  const eqs = input.split('\n').map(s => s.trim()).filter(Boolean);
  const vars = [];
  const fns = [];
  try {
    for (const eq of eqs) {
      const [lhs, rhs] = eq.split('=').map(s => s.trim());
      if (!lhs || !rhs) throw new Error("Equation must be in form dx/dt = ...");
      const v = lhs.split('/')[0].replace('d', '').replace('dt', '').replace('/', '').trim();
      vars.push(v);
      fns.push(math.compile(rhs));
    }
    return {vars, fns};
  } catch (e) {
    throw new Error("Error parsing equations: " + e.message);
  }
}

function parseInitial(input, vars) {
  const vals = {};
  input.split(',').forEach(pair => {
    const [k, v] = pair.split('=').map(s => s.trim());
    if(vars.includes(k)) vals[k] = parseFloat(v);
  });
  return vars.map(v => vals.hasOwnProperty(v) ? vals[v] : 0);
}

// Generalized RK4 for N variables
function rk4(fns, vars, y0, t0, t1, steps) {
  const h = (t1-t0)/steps;
  const ys = [y0.slice()], ts = [t0];
  let y = y0.slice(), t = t0;
  for(let i=0;i<steps;i++) {
    let k1 = fns.map((f,j)=>f.evaluate(Object.assign({t}, Object.fromEntries(vars.map((v,idx)=>[v,y[idx]])))));
    let k2_input = y.map((v,j)=>v + h*k1[j]/2);
    let k2 = fns.map((f,j)=>f.evaluate(Object.assign({t: t+h/2}, Object.fromEntries(vars.map((v,idx)=>[v,k2_input[idx]])))));
    let k3_input = y.map((v,j)=>v + h*k2[j]/2);
    let k3 = fns.map((f,j)=>f.evaluate(Object.assign({t: t+h/2}, Object.fromEntries(vars.map((v,idx)=>[v,k3_input[idx]])))));
    let k4_input = y.map((v,j)=>v + h*k3[j]);
    let k4 = fns.map((f,j)=>f.evaluate(Object.assign({t: t+h}, Object.fromEntries(vars.map((v,idx)=>[v,k4_input[idx]])))));
    y = y.map((v,j)=>v + h*(k1[j]+2*k2[j]+2*k3[j]+k4[j])/6);
    t += h;
    ys.push(y.slice());
    ts.push(t);
  }
  return {ys, ts};
}

function solveAndPlot() {
  document.getElementById('error').innerText = '';
  try {
    const sys = parseSystem(document.getElementById('systemInput').value);
    const y0 = parseInitial(document.getElementById('initInput').value, sys.vars);
    const tspec = document.getElementById('timeSpan').value.split(',').map(Number);
    if(tspec.length !== 2 || tspec.some(isNaN)) throw new Error("Time span must be two numbers separated by a comma");
    const [t0, t1] = tspec;
    const sol = rk4(sys.fns, sys.vars, y0, t0, t1, 300);

    // Plot time series
    const data = sys.vars.map((v,j)=>({
      x: sol.ts, y: sol.ys.map(y=>y[j]), name: v, mode:'lines'
    }));
    Plotly.newPlot('plot', data, {
      title: 'Numerical Solution',
      xaxis:{title:'t'}, yaxis:{title:'Variables'}
    });

    // Phase portrait: Only show for 2D systems
    if(sol.ys[0].length>=2) {
      Plotly.newPlot('phasePortrait', [{
        x: sol.ys.map(y=>y[0]), y: sol.ys.map(y=>y[1]), mode:'lines', name:'Trajectory'
      }], {
        title:'Phase Portrait',
        xaxis:{title:sys.vars[0]},
        yaxis:{title:sys.vars[1]}
      });
    } else {
      document.getElementById('phasePortrait').innerHTML = '';
    }
  } catch(e) {
    document.getElementById('error').innerText = e.message;
    document.getElementById('plot').innerHTML = '';
    document.getElementById('phasePortrait').innerHTML = '';
  }
}
