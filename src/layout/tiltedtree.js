import "layout";
import "hierarchy";

// Node-link tree diagram using the Reingold-Tilford "tidy" algorithm
d3.layout.tiltedtree = function() {
  var hierarchy = d3.layout.hierarchy().sort(null).value(null),
      separation = d3_layout_treeSeparation,
      size = [1, 1], // width, height
      nodeSize = null;
  
  // begin added by Xi He
  var DIST=2;
  // end added by Xi He
  
  
  function tree(d, i) {
    var nodes = hierarchy.call(this, d, i),
        root0 = nodes[0],
        root1 = wrapTree(root0);

    // Compute the layout using Buchheim et al.'s algorithm.
    d3_layout_hierarchyVisitAfter(root1, firstWalk);
    root1.parent.m = 0;
    root1.parent.g=0;
    d3_layout_hierarchyVisitBefore(root1, secondWalk);
    d3_layout_hierarchyVisitBefore(root1, thirdWalk);


    // If a fixed node size is specified, scale x and y.
    if (nodeSize) d3_layout_hierarchyVisitBefore(root0, sizeNode);

    // If a fixed tree size is specified, scale x and y based on the extent.
    // Compute the left-most, right-most, and depth-most nodes for extents.
    else {
      var left = root0,
          right = root0,
          // begin added by Xi He
          top=root0,
          // end added by Xi He
          bottom = root0;
      d3_layout_hierarchyVisitBefore(root0, function(node) {
        if (node.x < left.x) left = node;
        if (node.x > right.x) right = node;
        // begin modified by Xi He
        //if (node.depth > bottom.depth) bottom = node;
      	if(node.y<top.y) top=node;
      	if(node.y>bottom.y) bottom=node;
      	// end modified by Xi He
      });
      var tx = separation(left, right) / 2 - left.x,
          kx = size[0] / (right.x + separation(right, left) / 2 + tx);
      
      // begin added by Xi He
      // ky = size[1] / (bottom.depth || 1);
      var ty=separation(bottom,top)/2-top.y,
      	  ky=size[1] / (bottom.y + DIST/2 + ty);
      // end added by Xi He
      
      d3_layout_hierarchyVisitBefore(root0, function(node) {
        node.x = (node.x + tx) * kx;
        // begin modified by Xi He
        //node.y = node.depth * ky;
        node.y=(node.y+ty)*ky;
        // end modified by Xi He
      });
    }

    return nodes;
  }

  function wrapTree(root0) {
    var root1 = {A: null, children: [root0]},
        queue = [root1],
        node1;

    while ((node1 = queue.pop()) != null) {
      for (var children = node1.children, child, i = 0, n = children.length; i < n; ++i) {
        queue.push((children[i] = child = {
          _: children[i], // source node
          parent: node1,
          children: (child = children[i].children) && child.slice() || [],
          A: null, // default ancestor
          a: null, // ancestor
          z: 0, // prelim
          m: 0, // mod
          c: 0, // change
          s: 0, // shift
          t: null, // thread
          
          // begin added by Xi He
          h:0, //height prelim
          g:0, //height mod
          l:0, // # of leaves
          //left:null, //left-most leaf
          //right:null, //right-most leaf
          
          level:0, //level of the node in the tree.
          // end added by Xi He
          
          i: i // number
        }).a = child);
      }
    }

    return root1.children[0];
  }

  // FIRST WALK
  // Computes a preliminary x-coordinate for v. Before that, FIRST WALK is
  // applied recursively to the children of v, as well as the function
  // APPORTION. After spacing out the children by calling EXECUTE SHIFTS, the
  // node v is placed to the midpoint of its outermost children.
  function firstWalk(v) {
    var children = v.children,
        siblings = v.parent.children,
        w = v.i ? siblings[v.i - 1] : null;
    
    // begin added by Xi He   
    // count the number of leaves.
    if(children.length==0){
    	v.l=1;
    }
    else {
    	for(var i=0;i<children.length;i++){
    		v.l=v.l+children[i].l;
    	}
    }
    // end added by Xi He
    
    // begin added by Xi He   
    // count the number of level of its children.
	var maxlevel;
	if(children.length==0){
		v.level=1;
	}
	else{
		maxlevel=children[0].level;
    	for(var i=1;i<children.length;i++){
    		if(maxlevel<children[i].level){
    			maxlevel=children[i].level;
    		}
    	}
    	v.level=maxlevel+1;
	}
    // end added by Xi He
    
    if (children.length) {
    	//d3_layout_treeShift(v);
    	var midpoint = (children[0].z + children[children.length - 1].z) / 2;
		v.z=midpoint;	
    } else if (w) {
        //while(w.children.length!=0){
    	//	w=w.children[w.children.length-1];
    	//}
    	if(w.children.length==0){
	    	v.z = w.z + separation(v._, w._);
    	}
    }    
    
    // begin added by Xi He    
    if(children.length){
    	var min_children;
    	min_children=(children[0].h+children[0].g);
    	for(var i=1;i<children.length;i++){
    		if(min_children>(children[i].h+children[i].g)){
    			min_children=(children[i].h+children[i].g);
    		}
    	}
    	v.h=min_children-DIST;
    	if(w){
    		v.g=w.g+DIST*w.l;
    	}
    }
    else if(w){
		var tmp11=0;
		var tmp111=w;
		while(tmp111.children.length!=0){
			tmp11+=tmp111.g;
			tmp111=tmp111.children[tmp111.children.length-1];
		}
		v.g=tmp111.h+DIST+tmp11+tmp111.g;
    }
    // end added by Xi He
    
    if(w){
    	apportion_mod(v, w);	
    }
    
    //v.parent.A = apportion(v, w, v.parent.A || siblings[0]);
  }

  // SECOND WALK
  // Computes all real x-coordinates and y-coordinates by summing up the modifiers recursively.
  function secondWalk(v) {
    v.m += v.parent.m;
    v._.x = v.z + v.m;
    // begin added by Xi He
    v.g+=v.parent.g;
    v._.y=v.h+v.g;
    // end added by Xi He
  }

  // third WALK y-coordinates adjustment.

  function thirdWalk(v){
  	var i;
  	var spots;
  	var level;
  	var loc;
  	for(i=0;i<v.children.length;i++){
  		if(v.children[i].level>1){
	  		spots=(v.children[i]._.y-v._.y)/DIST-1;
  			loc=Math.floor(spots/(v.children[i].level));
			v.children[i]._.y=v._.y+(1+loc)*DIST;
			//v.children[i]._.y=v._.y+(loc)*DIST;
  		}
  	}
  }
   

  // APPORTION
  // The core of the algorithm. Here, a new subtree is combined with the
  // previous subtrees. Threads are used to traverse the inside and outside
  // contours of the left and right subtree up to the highest common level. The
  // vertices used for the traversals are vi+, vi-, vo-, and vo+, where the
  // superscript o means outside and i means inside, the subscript - means left
  // subtree and + means right subtree. For summing up the modifiers along the
  // contour, we use respective variables si+, si-, so-, and so+. Whenever two
  // nodes of the inside contours conflict, we compute the left one of the
  // greatest uncommon ancestors using the function ANCESTOR and call MOVE
  // SUBTREE to shift the subtree and prepare the shifts of smaller subtrees.
  // Finally, we add a new thread (if necessary).
  
  function apportion(v, w, ancestor) {
    if (w) {
      var vip = v,
          vop = v,
          vim = w,
          vom = vip.parent.children[0],
          sip = vip.m,
          sop = vop.m,
          sim = vim.m,
          som = vom.m,
          shift;
      while (vim = d3_layout_treeRight(vim), vip = d3_layout_treeLeft(vip), vim && vip) {
        vom = d3_layout_treeLeft(vom);
        vop = d3_layout_treeRight(vop);
        vop.a = v;
        shift = vim.z + sim - vip.z - sip + separation(vim._, vip._);
        if (shift > 0) {
          d3_layout_treeMove(d3_layout_treeAncestor(vim, v, ancestor), v, shift);
          sip += shift;
          sop += shift;
        }
        sim += vim.m;
        sip += vip.m;
        som += vom.m;
        sop += vop.m;
      }
      if (vim && !d3_layout_treeRight(vop)) {
        vop.t = vim;
        vop.m += sim - sop;
      }
      if (vip && !d3_layout_treeLeft(vom)) {
        vom.t = vip;
        vom.m += sip - som;
        ancestor = v;
      }
    }
    return ancestor;
  }

  function apportion_mod(v, w) {
    
    var tmp1;
    var mod1=0;
    tmp1=w;
    while(tmp1.children.length>0){
    	tmp1=tmp1.children[tmp1.children.length-1];
    	mod1+=tmp1.m;
    }
    var tmp2;
    var mod2=0;
    tmp2=v;
    while(tmp2.children.length>0){
    	tmp2=tmp2.children[0];
    	mod2+=tmp2.m;
    }
	var dis=(mod1+tmp1.z+separation(v._, w._)-mod2-tmp2.z);
  	v.z=v.z+dis;
  	var i;
  	for(i=0;i<v.children.length;i++){
  		v.children[i].m=dis+v.children[i].m;
  	}
  }

  function sizeNode(node) {
    node.x *= size[0];
    node.y = node.depth * size[1];
  }

  tree.separation = function(x) {
    if (!arguments.length) return separation;
    separation = x;
    return tree;
  };

  tree.size = function(x) {
    if (!arguments.length) return nodeSize ? null : size;
    nodeSize = (size = x) == null ? sizeNode : null;
    return tree;
  };

  tree.nodeSize = function(x) {
    if (!arguments.length) return nodeSize ? size : null;
    nodeSize = (size = x) == null ? null : sizeNode;
    return tree;
  };

  return d3_layout_hierarchyRebind(tree, hierarchy);
};

function d3_layout_treeSeparation(a, b) {
  return a.parent == b.parent ? 1 : 2;
}

// function d3_layout_treeSeparationRadial(a, b) {
//   return (a.parent == b.parent ? 1 : 2) / a.depth;
// }

// NEXT LEFT
// This function is used to traverse the left contour of a subtree (or
// subforest). It returns the successor of v on this contour. This successor is
// either given by the leftmost child of v or by the thread of v. The function
// returns null if and only if v is on the highest level of its subtree.
function d3_layout_treeLeft(v) {
  var children = v.children;
  return children.length ? children[0] : v.t;
}

// NEXT RIGHT
// This function works analogously to NEXT LEFT.
function d3_layout_treeRight(v) {
  var children = v.children, n;
  return (n = children.length) ? children[n - 1] : v.t;
}

// MOVE SUBTREE
// Shifts the current subtree rooted at w+. This is done by increasing
// prelim(w+) and mod(w+) by shift.
function d3_layout_treeMove(wm, wp, shift) {
  var change = shift / (wp.i - wm.i);
  wp.c -= change;
  wp.s += shift;
  wm.c += change;
  wp.z += shift;
  wp.m += shift;
}

// EXECUTE SHIFTS
// All other shifts, applied to the smaller subtrees between w- and w+, are
// performed by this function. To prepare the shifts, we have to adjust
// change(w+), shift(w+), and change(w-).
function d3_layout_treeShift(v) {
  var shift = 0,
      change = 0,
      children = v.children,
      i = children.length,
      w;
  while (--i >= 0) {
    w = children[i];
    w.z += shift;
    w.m += shift;
    shift += w.s + (change += w.c);
  }
}

// ANCESTOR
// If vi-’s ancestor is a sibling of v, returns vi-’s ancestor. Otherwise,
// returns the specified (default) ancestor.
function d3_layout_treeAncestor(vim, v, ancestor) {
  return vim.a.parent === v.parent ? vim.a : ancestor;
}
