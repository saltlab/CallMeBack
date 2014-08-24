(function (__global) {
    var tmp0, tmp1, tmp2, tmp3, tmp4, tmp5, tmp6, tmp7, tmp8, tmp9, tmp10, tmp11, tmp12, tmp13, tmp27, tmp28;
    tmp13 = function (args, cb) {
        var tmp14, tmp15, tmp16, tmp17, tmp18, tmp19, tmp20, tmp21, tmp22, tmp23, tmp24, tmp25, tmp26;
        // if(!args)
        tmp15 = args;
        tmp14 = !tmp15;
        if (tmp14) {
            // return cb(new Error('args required'));
            tmp17 = cb;
            tmp20 = 'Error';
            tmp19 = __global[tmp20];
            tmp21 = 'args required';
            tmp18 = new tmp19(tmp21);
            tmp16 = tmp17(tmp18);
            return tmp16;
        } else {
            ;
        }
        // setTimeout(cb, 100);
        tmp23 = 'setTimeout';
        tmp22 = __global[tmp23];
        tmp24 = cb;
        tmp25 = 100;
        tmp26 = tmp22(tmp24, tmp25);
        return;
    };
    tmp12 = 'getData';
    __global[tmp12] = tmp13;
    tmp28 = function (params) {
        var tmp29, tmp30, tmp31, tmp32, tmp33;
        // console.log(params);
        tmp31 = 'console';
        tmp29 = __global[tmp31];
        tmp30 = 'log';
        tmp32 = params;
        tmp33 = tmp29[tmp30](tmp32);
        return;
    };
    tmp27 = 'render';
    __global[tmp27] = tmp28;
    // getData(null, render);
    tmp1 = 'getData';
    tmp0 = __global[tmp1];
    tmp2 = null;
    tmp4 = 'render';
    tmp3 = __global[tmp4];
    tmp5 = tmp0(tmp2, tmp3);
    // getData('students', render);
    tmp7 = 'getData';
    tmp6 = __global[tmp7];
    tmp8 = 'students';
    tmp10 = 'render';
    tmp9 = __global[tmp10];
    tmp11 = tmp6(tmp8, tmp9);
}(typeof global === 'undefined' ? this : global));
