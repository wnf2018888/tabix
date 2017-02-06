/*
 * Copyright (C) 2017 IgorStrykhar  in  SMI2
 * All rights reserved.
 * GPLv3
 */

((angular, smi2) => {
    'use strict';

    angular.module(smi2.app.name).directive('drawWidget', ['$compile','$rootScope', function ($compile,$rootScope) {
        return {
            restrict: 'EA',
            template: '<div></div>',
            scope: {
                widget: '=widget',
                isdark: '=isdark'
            },
            link: buildLinkFunc($compile,$rootScope)
        };
    }]);


    function buildDrawChart(widget) {
        let html='';

        let x=widget.draw;
        if (widget.library=='echart') {
            console.info('DW:echart');
        }
        if (widget.library=='c3') {
            console.info('DW:c3');
        }
        if (widget.library=='d3') {
            console.info('DW:d3');
        }
        if (widget.library=='amchart') {
            console.info('DW:amchart');
        }

        if (widget.preProcessor instanceof Function) {
            widget.preProcessor();
        }

        //
        // var chart, options;
        // chart = echarts.init(ele[0], 'macarons');
        //
        // //
        // createChart(scope.widget);
        //
        // //
        // function createChart(options) {
        //     if (!options) return;
        //
        //     chart.setOption(options);
        //     // scope.$emit('create', chart);
        //
        //     angular.element($window).bind('resize', function(){
        //         chart.resize();
        //     });
        //
        // }
        //
        // // при изменении в виджете
        // scope.$watch('widget', function (newVal, oldVal) {
        //     if (angular.equals(newVal, oldVal)) return;
        //     createChart(widget);
        // })

        return html;
    }




    function buildLinkFunc($compile,$rootScope) {

        return function (scope, element, attrs) {
            // console.warn('buildLinkFunc',scope.widget);
            // ---------------------------------------------------------------------------------------------
            // Text & Error RENDER

            scope.widget.isDark=scope.isdark;
            if (scope.widget.type=='table' && scope.widget.text)
            {
                let x = angular.element( '<pre class="fs-caption">'+scope.widget.text+'</pre>');
                element.append(x);
                $compile(x)(scope);
                return ;
            }
            if (scope.widget.type=='table' && scope.widget.error)
            {
                console.warn("Error",scope.widget.error);
                let x = angular.element( '<pre class="fs-caption tc-red-700">'+scope.widget.error+'</pre>');
                element.append(x);
                $compile(x)(scope);
                return ;
            }

            if (scope.widget.error || scope.widget.textformat)
            {
                return ;
            }

            // ---------------------------------------------------------------------------------------------
            // TABLE RENDER
            $rootScope.$on('gridster-loaded', function(item) {
                console.info('> > > gridster-loaded');
                scope.widget.onResize();
            });

            $rootScope.$on('gridster-item-resized', function(item) {
                console.info('> > > gridster-item-resized < < < < <');
            });


            scope.$watch('widget.sizeX', function(){
                console.warn('widget.sizeX');
                // scope.widget.onResize();
            }, true);

            if (scope.widget.type=='table' && !scope.widget.error)
            {
                scope.widget.element = angular.element(`<hot-table
                        
                        settings="widget.table.settings"
                        datarows="widget.data.data"
                    
                        ng-class="{'handsontable-dark': widget.isDark}"
                        width="widget.table.width"
                        col-headers="widget.table.colHeaders"
                        manual-column-resize="true"
                    ></hot-table>`);
            }
//
            // ---------------------------------------------------------------------------------------------
            // RIVOT RENDER
            if (scope.widget.type=='draw' && !scope.widget.error )
            {
                scope.widget.element = angular.element(buildDrawChart(scope.widget));

            }
            if (scope.widget.type=='pivot' && !scope.widget.error)
            {
                //
                scope.widget.element = angular.element(`<div><pivot data="widget.data.data" config="widget.pivot.config" edit-mode="true"></pivot></div>`);

            }

//$scope.hotInstance

            element.append(scope.widget.element);
            $compile(scope.widget.element)(scope);


        };
    }

})(angular, smi2);