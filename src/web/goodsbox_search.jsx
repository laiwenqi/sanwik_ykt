import React from 'react';
import reqwest from 'reqwest';
import PubSub from 'pubsub-js';
import { QueueAnim,DatePicker,Row,Col,Form,Checkbox,Table,Modal,InputNumber,Input,Popconfirm,Icon, Button,Dropdown,Popover,Select,Tabs } from 'antd';
import classNames from 'classnames';
import web_config from '../function/config.js';
import commonFunction from '../function/function.js';
import Goodsbox from '../web/goodsbox.jsx';
import './goodsbox.less';
const FormItem = Form.Item;
const createForm = Form.create;
const InputGroup = Input.Group;
const confirm = Modal.confirm;

//页面名称
const PageName='Goodsbox_search'+Date.parse(new Date());

//定义卡箱类型
const goodsboxtype=[
            { text: '废弃箱', value:'0'},
            { text: '回收卡箱', value:'1'},
            { text: '发卡箱', value:'-1'}];

//指定表格每列内容
const columns = [{
  title: '卡箱编号',
  dataIndex: 'GBRP_GOODSBOX_CODE'
},{
  title: '卡箱类型',
  dataIndex: 'CTTP_CODE',
  render(text, row, index) {
    for(let i=0;i<goodsboxtype.length;i++){
      if(goodsboxtype[i].value==row.CTTP_CODE){
        return goodsboxtype[i].text;
        break;
      }
    }
  }
},{
  title: '结束时间',
  dataIndex: 'GBRP_END',
  render(text, row, index) {
   return row.GBRP_END==""||row.GBRP_END==null?
        '暂无':commonFunction.formatTime(row.GBRP_END,"yyyy-MM-dd hh:mm:ss")
  }
},{
  title: '操作',
  key: 'operation',
  render(text, row, index) {
    return (
      /* 把所在的行的数据传递下去 */
      <Edit {...row}/>
      );
    }
}];





//这里是默认简易的搜索
const SearchInput = React.createClass({
  getInitialState() {
    return {
      FILTER_KEY: '',
      focus: false,
    };
  },
  componentDidMount() {
    // 订阅 重置 的事件
    PubSub.subscribe(PageName+"Reset",this.handleReset);
  },
  componentWillUnmount(){
    //退订事件
    PubSub.unsubscribe(PageName+'Reset');
  },
  handleReset(){
    this.setState({
      FILTER_KEY:''
    });
  },
  handleInputChange(e) {
    this.setState({
      FILTER_KEY: e.target.value,
    });
  },
  handleFocusBlur(e) {
    this.setState({
      focus: e.target === document.activeElement,
    });
  },
  handleSearch(e) {
    let params={};
    params.FILTER_KEY=this.state.FILTER_KEY.trim();
    params.type="defaultSearch";
    if (this.props.onSearch) {
      this.props.onSearch(params);
    }
  },
  render() {
    const btnCls = classNames({
      'ant-search-btn': true,
      'ant-search-btn-noempty': !!this.state.FILTER_KEY.trim(),
    });
    const searchCls = classNames({
      'ant-search-input': true,
      'ant-search-input-focus': this.state.focus,
    });
    return (
      <InputGroup className={searchCls} style={this.props.style}>
        <Input {...this.props} value={this.state.FILTER_KEY} onChange={this.handleInputChange}
          onFocus={this.handleFocusBlur} onBlur={this.handleFocusBlur} />
          <div className="ant-input-group-wrap">
            <Button className={btnCls} size={this.props.size} onClick={this.handleSearch}>
              <Icon type="search" />
            </Button>
          </div>
        </InputGroup>
    );
  }
});





//这里是高级的搜索
let FilterLayer = React.createClass({
  getInitialState() {
    return {
    };
  },
  componentDidMount() {
    // 订阅 重置 的事件
    PubSub.subscribe(PageName+"Reset",this.handleButtonReset);
  },
  componentWillUnmount(){
    //退订事件
    PubSub.unsubscribe(PageName+'Reset');
  },
  handleButtonReset() {
    this.props.form.resetFields();
  },
  handleSubmit(e) {
    e.preventDefault();
    let params=this.props.form.getFieldsValue();
    params.type='moreSearch';
    this.props.search(params);
    this.props.fliterhide();
  },
  handleReset(e) {
    e.preventDefault();
    this.props.form.resetFields();
  },
  render() {
    const { getFieldProps } = this.props.form;
    const goodsboxtypeList=goodsboxtype.map(function(item){
      return (<Option value={String(item.value)} >{item.text}</Option>)
    });
    return (
      <Form  inline onSubmit={this.handleSubmit} >
        <FormItem
          label="卡箱类型：">
          <Select placeholder="请选择卡箱类型" style={{ width: 200 }} {...getFieldProps('FILTER_CTTP_CODE')}>
            { goodsboxtypeList }
          </Select>
        </FormItem>
        <br/>
        <FormItem>
            <Checkbox {...getFieldProps('FILTER_IS_END',{
              valuePropName: 'checked',
            })}/>
            是否已回收？
        </FormItem>

        <div style={{ textAlign: 'right' }}>
            <Button size="small" type="primary" htmlType="submit">搜索</Button>
            <Button style={{ marginLeft: '10px' }} size="small" onClick={this.handleReset}>清除条件</Button>
        </div>
      </Form>
    );
  }
});
FilterLayer = Form.create()(FilterLayer);







//点击操作编辑 弹窗内容
let ModalContent =React.createClass({
  getInitialState() {
    return {
      loading:false,//确定按钮状态
      nochangecontentV:this.props.contentValue,//这个用来对比是不是和原来的值一样，暂时用这个办法
      contentV:this.props.contentValue
    }
  },
  componentWillReceiveProps(){
    //每次打开还原表单的值
    if(this.props.visible==false){
      this.props.form.resetFields();
    }
  },
  handleSubmit(e) {
    e.preventDefault();
    this.props.form.validateFieldsAndScroll((errors, values) => {
      if (!!errors) {
        console.log('表单没通过验证');
        return;
      }
        /*判断弹窗表单值是否有改变，没有就不发布更新*/
       /*！！两个对象长度不等可能会导致不正确判断*/
       let aProps = Object.getOwnPropertyNames(values);
       let bProps = Object.getOwnPropertyNames(this.state.nochangecontentV);
       let hasChanged=0; /*0表示没有改变*/
         for (let i = 0; i < aProps.length; i++) {
           let propName = aProps[i];
           if (values[propName] != this.state.nochangecontentV[propName]) {
             hasChanged=1;
          }
         }
       if(hasChanged==0){
         this.handleCancel();
         return;
       }
       let EDIT_PARAMS={
         GBRP_ID:this.state.nochangecontentV.GBRP_ID,
         GBRP_GOODSBOX_CODE:this.state.nochangecontentV.GBRP_GOODSBOX_CODE,
         GBRP_END:this.state.nochangecontentV.GBRP_END
       };
      let params=commonFunction.objExtend(EDIT_PARAMS,values);
      //发布 编辑 事件
      this.state.loading=true;
      this.props.modalClose();
      PubSub.publish(PageName+"Edit",params);
    });
  },
  handleCancel() {
    this.props.modalClose();
  },
  getValidateStatus(field) {
   const { isFieldValidating, getFieldError, getFieldValue } = this.props.form;
   if (isFieldValidating(field)) {
     return 'validating';
   } else if (!!getFieldError(field)) {
     return 'error';
   } else if (getFieldValue(field)) {
     return 'success';
   }
 },
  render() {
     const { getFieldProps, getFieldError, isFieldValidating } = this.props.form;

     let goodsboxtypename;
     for(let i=0;i<goodsboxtype.length;i++){
       if(goodsboxtype[i].value==this.state.contentV.CTTP_CODE){
         goodsboxtypename=goodsboxtype[i].text;
         break;
       }
     }
     return (
       /*表单下拉组件 的 value 一定要全等，才能正确显示*/
       <Form inline form={this.props.form}>
       <div className="goodsboxdetail">
           <FormItem
             label="卡箱编号： "
             labelCol={{ span: 8 }}
             wrapperCol={{ span:15 }}>
             <div  style={{ width: 150 }}>{this.state.contentV.GBRP_GOODSBOX_CODE}</div>
           </FormItem>
           <FormItem
             label="终端编号："
             labelCol={{ span: 8 }}
             wrapperCol={{ span: 15 }}>
           <div  style={{ width: 150 }}>{this.state.contentV.DEV_CODE}</div>
           </FormItem>
           <FormItem
             label="卡箱类型："
             labelCol={{ span: 8 }}
             wrapperCol={{ span: 15 }}>
           <div  style={{ width: 150 }}>{goodsboxtypename}</div>
           </FormItem>
           <FormItem
             label="出入数量："
             labelCol={{ span: 8 }}
             wrapperCol={{ span: 15 }}>
           <div  style={{ width: 150 }}>{this.state.contentV.GBRP_COUNT_NUM}</div>
           </FormItem>
           <FormItem
             label="废弃数量："
             labelCol={{ span: 8 }}
             wrapperCol={{ span: 15 }}>
           <div  style={{ width: 150 }}>{this.state.contentV.GBRP_DISCARD_NUM}</div>
           </FormItem>
           <FormItem
             label="预存数量："
             labelCol={{ span: 8 }}
             wrapperCol={{ span: 15 }}>
           <div  style={{ width: 150 }}>{this.state.contentV.GBRP_SAVE_AMOUNT}</div>
           </FormItem>
           <FormItem
             label="开始时间："
             labelCol={{ span: 8 }}
             wrapperCol={{ span: 15 }}>
           <div  style={{ width: 150 }}>{commonFunction.formatTime(this.state.contentV.GBRP_BEGIN,"yyyy-MM-dd hh:mm:ss")}</div>
           </FormItem>
           <FormItem
             label="结束时间："
             labelCol={{ span: 8 }}
             wrapperCol={{ span: 15 }}>
           <div  style={{ width: 150 }}>{commonFunction.formatTime(this.state.contentV.GBRP_END,"yyyy-MM-dd hh:mm:ss")}</div>
           </FormItem>
        </div>
        <hr className="hr"/>
        <FormItem
          label={"清点数量："}
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 12 }}>
        <InputNumber min={0} placeholder={"请输入清点数量"} {...getFieldProps('GBRP_CHECK_NUM',{
            initialValue: this.state.contentV.GBRP_CHECK_NUM || 0
        })} style={{ width: 163 }}/>
        </FormItem>
        <div className="ant-modal-footer FormItem-modal-footer">
            <Button type="ghost" className="ant-btn ant-btn-ghost ant-btn-lg" onClick={this.handleCancel} >取消</Button>
            <Button type="primary" className="ant-btn ant-btn-primary ant-btn-lg" onClick={this.handleSubmit} loading={this.state.loading}>确定</Button>
        </div>
       </Form>
     )
   }
});
ModalContent = Form.create()(ModalContent);



//表格操作栏
const Edit = React.createClass({
  getInitialState() {
    return {
      loading: false,
      visible: false
    };
  },
  showModal() {
    this.setState({
      visible: true
    });
  },
  handleCancel() {
    this.setState({
      visible: false
    });
  },
  render() {
    return (
      <div>
        <a type="primary" onClick={this.showModal} {...this.props}>收钞录入</a>
        <Modal ref="modal"
          width="550"
          visible={this.state.visible}
          title={'收卡录入-卡箱'+this.props.GBRP_GOODSBOX_CODE}
          onCancel={this.handleCancel}
          footer={null} >
          <ModalContent
            modalClose={this.handleCancel} //传递取消事件
            contentValue={this.props}  //传递表单的值
            visible={this.state.visible}
            />
        </Modal>
      </div>
    );
  }
});







//标签分页里面的整个内容
const Search= React.createClass({
   getInitialState() {
    return {
      data: [],
      defaultFilter:{},
      moreFilter:{},
      pagination: {
        pageSize:10, //每页显示数目
        total:0,//数据总数
        current:1,//页数
        size:'large',
        showTotal:function showTotal(total) {
            return `共 ${total} 条记录`;
        },
        showQuickJumper:true,
        // showSizeChanger :true
      },
      loading: false,
      gaojisousuoVislble:false,
      Goodsbox:{
        visible:false,
        params:{}
      }
    };
  },
  handleTableChange(pagination, filters, sorter) {
    const pager = this.state.pagination;
    pager.current = pagination.current;
    this.setState({
      pagination: pager
    });
    const params = {
      type:'tableOnChange',
      pageSize: pagination.pageSize,
      current: pagination.current,
      sortField: sorter.field,
      sortOrder: sorter.order
    };
    for (let key in filters) {
      if (filters.hasOwnProperty(key)) {
        params[key] = filters[key];
      }
    }
    this.fetchList(params);
  },
  fetchList(params = {}) {
    switch (params.type) {
      case undefined:
      case 'undefined':
        params=commonFunction.objExtend(params,this.state.pagination);
        break;
      case 'defaultSearch': //默认搜索行为
        this.state.defaultFilter=commonFunction.filterParamsObj(params);
        params=commonFunction.objExtend(params,this.state.moreFilter);
        params=commonFunction.objExtend(params,{
          pageSize:10, //每页显示数目
          current:1//页数
        });
        break;
      case 'moreSearch':    //高级搜索行为
        this.state.moreFilter=commonFunction.filterParamsObj(params);
        params=commonFunction.objExtend(params,this.state.defaultFilter);
        params=commonFunction.objExtend(params,{
          pageSize:10, //每页显示数目
          current:1//页数
        });
        break;
      case 'tableOnChange'://翻页排序等行为
        this.state.pagination={
          pageSize:params.pageSize,
          current:params.currentPage,
          sortField:params.sortField,
          sortOrder:params.sortOrder
        };
        params=commonFunction.objExtend(params,this.state.moreFilter);
        params=commonFunction.objExtend(params,this.state.defaultFilter);
        break;
      default:
        params=commonFunction.objExtend({},params);
    }
    this.setState({ loading: true });
    reqwest({
      url:web_config.http_request_domain+'/proc/goodsbox/search',
      method: 'POST',
      timeout :web_config.http_request_timeout,
      data:params,
      crossOrigin: web_config.http_request_cross, //跨域
      type: "json",
      success: (result) => {
        if(result.data.ERROR!=0){
          commonFunction.MessageTip(result.data.MSG,2,'error');
          this.setState({
            loading: false
          });
          return;
        }
        const pagination = this.state.pagination;
        pagination.total = result.data.O_T_GOODSBOX_RP.count;
        pagination.current = result.data.O_T_GOODSBOX_RP.currentPage;
        this.setState({
          loading: false,
          data: result.data.O_T_GOODSBOX_RP.data,
          pagination,
        });
      },
      error:()=>{
        commonFunction.MessageTip('获取数据失败',2,'error');
        this.setState({
          loading: false
        });
      }
    });
  },
  fetchEdit(evtName,data){
    let EditParams=commonFunction.objExtend({},data);
    let listParams=commonFunction.objExtend({},this.state.defaultFilter);
    listParams=commonFunction.objExtend(listParams,this.state.moreFilter);
    listParams=commonFunction.objExtend(listParams,this.state.pagination);
    this.setState({ loading: true });
    reqwest({
      url:web_config.http_request_domain+'/proc/goodsbox/count',
      method: 'POST',
      timeout :web_config.http_request_timeout,
      data:EditParams,
      crossOrigin: web_config.http_request_cross, //跨域
      type: "json",
      success: (result) => {
        result.data.ERROR==0&&commonFunction.MessageTip("卡箱"+EditParams.GBRP_GOODSBOX_CODE+'，录入成功',2,'success');
        result.data.ERROR!=0&&commonFunction.MessageTip("卡箱"+EditParams.GBRP_GOODSBOX_CODE+'，'+result.data.MSG,2,'error');
        this.fetchList(listParams);
      },
      error:()=>{
        commonFunction.MessageTip("卡箱"+EditParams.GBRP_GOODSBOX_CODE+'，录入失败',2,'error');
        this.fetchList(listParams);
      }
    });
  },
  componentDidMount() {
    this.fetchList();
    // 订阅 录入 的事件
    PubSub.subscribe(PageName+"Edit",this.fetchEdit);
  },
  componentWillUnmount(){
    //退订事件
    PubSub.unsubscribe(PageName+"Edit");
  },
  filterDisplay(){
    this.setState({
      gaojisousuoVislble:!this.state.gaojisousuoVislble
    });
  },
  fliterDisplayChange(e){
    this.setState({
      gaojisousuoVislble:e
    });
  },
  resetSearch(){
    this.setState({
      defaultFilter:{},
      moreFilter:{},
      pagination: {
        pageSize:10, //每页显示数目
        total:0,//数据总数
        current:1,//页数
        size:'large',
        showTotal:function showTotal(total) {
            return `共 ${total} 条记录`;
        },
        showQuickJumper:true
      }
    });
    PubSub.publish(PageName+"Reset",{});
    this.fetchList({
      type:'reset',
      pageSize:10,
      current:1
    });
  },
  handleGoodsbox(){
    PubSub.unsubscribe(PageName+"Edit");
    this.setState({
      Goodsbox:{
        visible:true,
        params:''
      }
    });
  },
  render() {
    if(this.state.Goodsbox.visible==true){
      return (<Goodsbox {...this.state.Goodsbox.params}/>)
    }

    const FilterLayerContent= (
      <FilterLayer search={this.fetchList} fliterhide={this.filterDisplay}/>
    );
    return (
    <div>
     <Row>
      <Col span="4"><SearchInput placeholder="输入卡箱编号搜索" onSearch={this.fetchList} /> </Col>
      <Col span="2" style={{marginLeft:-10}} >
        <Popover placement="bottom" visible={this.state.gaojisousuoVislble} onVisibleChange={this.fliterDisplayChange} overlay={FilterLayerContent} trigger="click">
            <Button type="primary" htmlType="submit" className="gaojibtn" >高级搜索</Button>
        </Popover>
      </Col>
      <Col span="1" style={{marginLeft:-20}}>
        <Button type="primary" htmlType="submit" onClick={this.resetSearch} >重置</Button>
      </Col>
        <Col span="12" className="table-add-layer"><Button onClick={this.handleGoodsbox} className="table-return-btn" type="primary" htmlType="submit"><Icon type="rollback" />返回收卡结果</Button></Col>
     </Row>
        <div className="margin-top-10"></div>
        <Table columns={columns}
            dataSource={this.state.data}
            pagination={this.state.pagination}
            loading={this.state.loading}
            onChange={this.handleTableChange} /*翻页 筛选 排序都会触发 onchange*/
            size="middle"
            rowKey={record => record.GBRP_ID} /*指定每行的主键 不指定默认key*/
            bordered={true}
        />
    </div>
    );
  }
});



export default Search;
